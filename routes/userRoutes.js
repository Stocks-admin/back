import express from "express";
import pkg from "apicache";
import {
  getAllUsers,
  getUserBenchmark,
  getUserInfo,
  getUserPortfolio,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares.js";
import jwt from "jsonwebtoken";

const { middleware } = pkg;
const user = express.Router();
const cache = middleware;

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
    const resp = await getUserPortfolio(payload.userId);
    res.status(200).send(resp);
  } catch (e) {
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

user.get("/benchmark", isAuthenticated, async (req, res) => {
  try {
    const { authorization } = req.headers;
    const { interval } = req.query;
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
    const resp = await getUserBenchmark(payload.userId, interval);
    return res.status(200).send(resp);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

user.get("/allUsers", async (req, res) => {
  try {
    const resp = await getAllUsers();
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
