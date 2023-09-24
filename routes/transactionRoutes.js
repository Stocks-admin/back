import express from "express";
import {
  createTransaction,
  getUserTotalTransactions,
  getUserTransactions,
} from "../controllers/transactionController.js";
import { isAuthenticated } from "../middlewares.js";
import jwt from "jsonwebtoken";

const transactions = express.Router();
// POST /user/signin

transactions.post("/createTransaction", async (req, res) => {
  try {
    const body = req.body;
    const resp = await createTransaction(body);
    res.status(200).send(resp);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

transactions.get("/userTransactions", isAuthenticated, async (req, res) => {
  try {
    const { offset, limit } = req.query;
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
    const resp = await getUserTransactions(
      payload.userId,
      parseInt(offset) | 0,
      parseInt(limit) | 10
    );
    const total = await getUserTotalTransactions(payload.userId);
    res.status(200).send({ transactions: resp, total });
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

export default transactions;
