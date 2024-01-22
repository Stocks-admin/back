import express from "express";
import {
  cleanUserTransactions,
  createTransaction,
  deleteTransaction,
  getUserTransactions,
  massiveLoadTransactions,
} from "../controllers/transactionController.js";
import { isAuthenticated } from "../middlewares.js";
import jwt from "jsonwebtoken";
import errorMessages from "../constants/errorMessages.js";
import multer from "multer";
import xlsx from "node-xlsx";

const storage = multer.memoryStorage(); // Cambiado a memoryStorage para manejar archivos en memoria
const upload = multer({ storage });

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
        console.log("ERROR", e);
        return res.status(500).send({ error: e.toString() });
      });
  } catch (e) {
    console.log("ERROR", e);
    res.status(500).send({ error: errorMessages.default });
  }
});

transactions.post(
  "/massiveCreateTransaction",
  upload.single("file"),
  async (req, res) => {
    try {
      const { authorization } = req.headers;
      const access_token = authorization.split(" ")[1];
      if (!access_token) {
        return res.status(401).send(errorMessages.unauthorized);
      }
      const payload = jwt.verify(access_token, process.env.JWT_ACCESS_SECRET);
      if (!payload?.userId) {
        return res.status(401).send(errorMessages.unauthorized);
      }

      const { file } = req;
      if (!file) {
        return res.status(500).send({ error: errorMessages.invalidFile });
      }
      const workSheetsFromFile = xlsx.parse(file.buffer);
      if (workSheetsFromFile?.length === 0) {
        return res.status(500).send({ error: errorMessages.invalidFile });
      }
      const transactions = await massiveLoadTransactions(
        payload.userId,
        workSheetsFromFile[0].data
      );
      return res.status(200).send({ transactions });
    } catch (e) {
      console.log("ERROR", e);
      res.status(500).send({ error: errorMessages.default });
    }
  }
);

transactions.get("/userTransactions", isAuthenticated, async (req, res) => {
  try {
    const { offset, limit, dateFrom, dateTo, symbol } = req.query;
    console.log(req.query);
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
      dateTo,
      symbol
    );
    res.status(200).send(resp);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

transactions.delete(
  "/deleteTransaction/:transaction_id",
  isAuthenticated,
  async (req, res) => {
    try {
      const { transaction_id } = req.params;
      const { authorization } = req.headers;
      const access_token = authorization.split(" ")[1];

      if (!access_token) {
        return res.status(401).send({
          message: "Missing access token. Unauthorized",
        });
      }
      if (!transaction_id) {
        return res
          .status(500)
          .send({ error: errorMessages.transaction.missingInfo });
      }
      const payload = jwt.verify(access_token, process.env.JWT_ACCESS_SECRET);
      if (!payload?.userId) {
        return res.status(401).send({
          message: "Unauthorized.",
        });
      }
      const resp = await deleteTransaction(
        parseInt(transaction_id),
        payload.userId
      );
      res.status(200).send(resp);
    } catch (e) {
      res.status(500).send(e.toString());
    }
  }
);

transactions.delete(
  "/deleteAllTransactions",
  isAuthenticated,
  async (req, res) => {
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
      const resp = await cleanUserTransactions(payload.userId);
      res.status(200).send(resp);
    } catch (e) {
      res.status(500).send(e.toString());
    }
  }
);
export default transactions;
