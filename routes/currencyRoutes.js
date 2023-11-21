import express from "express";
import { getCurrentDollarValue } from "../controllers/currencyController.js";

const currencies = express.Router();

currencies.get("/dolar", async (req, res) => {
  try {
    getCurrentDollarValue()
      .then((data) => {
        res.status(200).send(data);
      })
      .catch((e) => {
        res.status(500).send(e.toString());
      });
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

export default currencies;
