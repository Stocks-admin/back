import express from "express";
import {
  getUserInfo,
  getUserPortfolio,
  getUserWallet,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares.js";
import jwt from "jsonwebtoken";

const user = express.Router();

user.get("/wallet/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const resp = await getUserWallet(parseInt(userId));
    res.status(200).send(resp);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

user.get("/portfolio", isAuthenticated, async (req, res) => {
  try {
    const { authorization } = req.headers;
    const access_token = authorization.split(" ")[1];
    if (!access_token) {
      return res.status(401).send({
        message: "Missing access token. Unauthorized",
      });
    }
    const payload = jwt.verify(access_token, process.env.JWT_ACCESS_SECRET);
    if (!payload?.userId) {
      return res.status(401).send({
        message: "Unauthorized.",
      });
    }
    console.log("payload: ", payload);
    const resp = await getUserPortfolio(payload.userId);
    res.status(200).send(resp);
  } catch (e) {
    console.log("Error: ", e);
    res.status(500).send(e.toString());
  }
});

user.get("/portfolio/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const resp = await getUserPortfolio(parseInt(userId));
    res.status(200).send(resp);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

user.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserInfo(parseInt(userId));
    res.status(200).send(user);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

export default user;
