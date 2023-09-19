import express from "express";
import { getCurrentDolarValue } from "../controllers/currencyController.js";

const currencies = express.Router();
// POST /user/signin
currencies.get("/dolar/:dolarType", async (req, res) => {
  try {
    const dolarType = req.params.dolarType;
    const dolarValue = await getCurrentDolarValue(dolarType);
    res.status(200).send(dolarValue);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

export default currencies;
