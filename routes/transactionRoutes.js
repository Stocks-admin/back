import express from "express";
import {
  createTransaction,
  getUserTransactions,
} from "../controllers/transactionController.js";
import { isAuthenticated } from "../middlewares.js";
import jwt from "jsonwebtoken";
import errorMessages from "../constants/errorMessages.js";

const transactions = express.Router();

transactions.post("/createTransaction", isAuthenticated, async (req, res) => {
  try {
    const body = req.body;
    if (
      !body.symbol ||
      !body.amount_sold ||
      !body.transaction_type ||
      !body.transaction_date ||
      !body.symbol_price ||
      !body.market
    ) {
      return res
        .status(500)
        .send({ error: errorMessages.transaction.missingInfo });
    }
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

    createTransaction(body, payload.userId)
      .then(({ data }) => {
        return res.status(200).send(data);
      })
      .catch((e) => {
        return res.status(500).send({ error: e.toString() });
      });
  } catch (e) {
    res.status(500).send({ error: errorMessages.default });
  }
});

transactions.get("/userTransactions", isAuthenticated, async (req, res) => {
  try {
    const { offset, limit, dateFrom, dateTo } = req.query;
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
      parseInt(limit) | 10,
      dateFrom,
      dateTo
    );
    // const total = await getUserTotalTransactions(payload.userId);
    res.status(200).send(resp);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

export default transactions;
