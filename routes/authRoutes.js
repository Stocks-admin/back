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
import errorMessages from "../constants/errorMessages.js";

const auth = express.Router();

auth.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new Error(errorMessages.user.missingInfo);
    }

    const existingUser = await getUserByEmail(email);
    if (!existingUser) {
      return res.status(403).send({
        message: errorMessages.user.invalidLogin,
      });
    }

    const validPassword = await compare(password, existingUser.password);
    if (!validPassword) {
      res.status(403).send({
        message: errorMessages.user.invalidLogin,
      });
      return;
    }
    const jti = uuidv4();
    const { accessToken, refreshToken } = generateTokens(existingUser, jti);
    await addRefreshTokenToWhitelist({
      jti,
      refreshToken,
      user_id: existingUser.user_id,
    });
    const { password: userPass, ...user } = existingUser;
    res.json({
      user: { ...user, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
});

auth.post("/register", async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password) {
      throw new Error(errorMessages.user.missingInfo);
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      throw new Error(errorMessages.user.alreadyExists);
    }

    const user = await createUser(email, password, name, phone);
    if (!user) {
      res.status(400).send({
        message: errorMessages.default,
      });
    }
    const jti = uuidv4();
    const { accessToken, refreshToken } = generateTokens(user, jti);
    if (!accessToken || !refreshToken) {
      res.status(400).send({
        message: errorMessages.default,
      });
    }
    await addRefreshTokenToWhitelist({
      jti,
      refreshToken,
      user_id: parseInt(user.user_id),
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
        message: errorMessages.user.unauthorized,
      });
      return;
    }
    const payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const savedRefreshToken = await findRefreshTokenById(payload.jti);

    if (!savedRefreshToken || savedRefreshToken.revoked === true) {
      res.status(401).send({
        message: errorMessages.user.unauthorized,
      });
      return;
    }

    const hashedToken = hashToken(refresh_token);
    if (hashedToken !== savedRefreshToken.hashedToken) {
      res.status(401).send({
        message: errorMessages.user.unauthorized,
      });
      return;
    }

    const user = await getUserById(payload.user_id);
    if (!user) {
      res.status(401).send({
        message: errorMessages.user.unauthorized,
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
    res.status(500).send(errorMessages.default);
  }
});

auth.get("/personalInfo", async (req, res) => {
  try {
    const { authorization } = req.headers;
    const access_token = authorization.split(" ")[1];
    if (!access_token) {
      res.status(401).send({
        message: errorMessages.user.unauthorized,
      });
      return;
    }
    const payload = jwt.verify(access_token, process.env.JWT_ACCESS_SECRET);
    const user = await getUserInfo(payload.userId);
    if (!user) {
      res.status(401).send({
        message: errorMessages.user.notFound,
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
        message: errorMessages.user.unauthorized,
      });
      return;
    }
    const payload = jwt.verify(access_token, process.env.JWT_ACCESS_SECRET);
    await revokeTokens(payload.userId);
    res.status(200).send({
      message: errorMessages.user.logout,
    });
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

export default auth;
