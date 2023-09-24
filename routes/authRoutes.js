import express from "express";
import {
  createUser,
  getUserByEmail,
  getUserById,
  hashToken,
} from "../controllers/authController.js";
import { compare } from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import {
  addRefreshTokenToWhitelist,
  deleteRefreshToken,
  findRefreshTokenById,
  generateTokens,
  revokeTokens,
} from "../utils/jwt.js";
import jwt from "jsonwebtoken";
import { getUserInfo } from "../controllers/userController.js";

const auth = express.Router();

auth.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(500).send({
        message: "You must provide an email and a password.",
      });
      throw new Error("You must provide an email and a password.");
    }

    const existingUser = await getUserByEmail(email);
    if (!existingUser) {
      res.status(403).send({
        message: "Incorrect combination of username and email.",
      });
      throw new Error("Incorrect combination of username and email.");
    }

    const validPassword = await compare(password, existingUser.password);
    if (!validPassword) {
      res.status(403).send({
        message: "Incorrect combination of username and email.",
      });
      throw new Error("Invalid login credentials.");
    }
    const jti = uuidv4();
    const { accessToken, refreshToken } = generateTokens(existingUser, jti);
    await addRefreshTokenToWhitelist({
      jti,
      refreshToken,
      user_id: existingUser.user_id,
    });
    res.json({
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

auth.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new Error("Falta informacion.");
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      throw new Error("Email already in use.");
    }

    const user = await createUser(email, password);
    if (!user) {
      res.status(400).send({
        message: "Undefined error.",
      });
    }
    const jti = uuidv4();
    const { accessToken, refreshToken } = generateTokens(user, jti);
    if (!accessToken || !refreshToken) {
      res.status(400).send({
        message: "Error generating tokens.",
      });
    }
    await addRefreshTokenToWhitelist({
      jti,
      refreshToken,
      userId: parseInt(user.user_id),
    });
    res.json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

auth.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      res.status(401).send({
        message: "Missing refresh token. Unauthorized",
      });
      return;
    }
    const payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const savedRefreshToken = await findRefreshTokenById(payload.jti);

    if (!savedRefreshToken || savedRefreshToken.revoked === true) {
      res.status(401).send({
        message: "refreshToken Revoked. Unauthorized.",
      });
      return;
    }

    const hashedToken = hashToken(refresh_token);
    if (hashedToken !== savedRefreshToken.hashedToken) {
      res.status(401).send({
        message: "Wrong token. Unauthorized.",
      });
      return;
    }

    const user = await getUserById(payload.user_id);
    if (!user) {
      res.status(401).send({
        message: "Different user. Unauthorized.",
      });
      return;
    }

    await deleteRefreshToken(savedRefreshToken.id);
    const jti = uuidv4();
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user,
      jti
    );
    await addRefreshTokenToWhitelist({
      jti,
      refreshToken: newRefreshToken,
      user_id: payload.user_id,
    });

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err.toString());
  }
});

auth.get("/personalInfo", async (req, res) => {
  try {
    const { authorization } = req.headers;
    const access_token = authorization.split(" ")[1];
    if (!access_token) {
      res.status(401).send({
        message: "Missing access token. Unauthorized",
      });
      return;
    }
    const payload = jwt.verify(access_token, process.env.JWT_ACCESS_SECRET);
    const user = await getUserInfo(payload.userId);
    if (!user) {
      res.status(401).send({
        message: "User not found.",
      });
      return;
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

auth.post("/logout", async (req, res) => {
  try {
    const { authorization } = req.headers;
    const access_token = authorization.split(" ")[1];
    if (!access_token) {
      res.status(401).send({
        message: "Missing access token. Unauthorized",
      });
      return;
    }
    const payload = jwt.verify(access_token, process.env.JWT_ACCESS_SECRET);
    await revokeTokens(payload.userId);
    res.status(200).send({
      message: "Logout successful.",
    });
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

export default auth;
