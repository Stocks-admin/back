import express from "express";
import {
  getSymbolPrice,
  getSymbolPriceOnDate,
} from "../controllers/symbolController.js";

const stocks = express.Router();
// POST /user/signin

stocks.get("/symbolValue/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const market = req.query.market;
    const date = req.query.date;
    if (date) {
      const resp = await getSymbolPriceOnDate(symbol, market, date);
      res.status(200).send(resp);
    } else {
      const resp = await getSymbolPrice(symbol, market);
      res.status(200).send(resp);
    }
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

export default stocks;
