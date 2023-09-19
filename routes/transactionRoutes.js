import express from "express";
import {
  createTransaction,
  getAllTransactions,
  getUserTransactions,
} from "../controllers/transactionController.js";
import { calculateModes } from "../helpers/transactionHelpers.js";

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

transactions.get("/userTransactions/:userId", async (req, res) => {
  try {
    const { offset, limit } = req.query;
    const user_id = req.params.userId;
    console.log(offset, limit);
    const resp = await getUserTransactions(
      parseInt(user_id),
      parseInt(offset) | 0,
      parseInt(limit) | 10
    );
    res.status(200).send(resp);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

transactions.get("/test", async (req, res) => {
  try {
    const resp = await calculateModes(1, "MELI");
    res.status(200).send(resp);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

export default transactions;
