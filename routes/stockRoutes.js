import express from "express";
import {
  getSymbolPrice,
  getSymbolPriceOnDate,
} from "../controllers/symbolController.js";
import axios from "axios";
import errorMessages from "../constants/errorMessages.js";
import moment from "moment";

const stocks = express.Router();

const axiosInstance = axios.create({
  baseURL: process.env.ARGDATA_API_URL,
});
// POST /user/signin

stocks.get("/symbolValue/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { market, date } = req.query;
    if (
      date &&
      moment(date).isValid() &&
      moment(date).startOf("day").isBefore(moment().startOf("day"))
    ) {
      const resp = await getSymbolPriceOnDate(symbol, market, date);
      res.status(200).send(resp);
    } else {
      const resp = await getSymbolPrice(symbol, market);
      res.status(200).send(resp);
    }
  } catch (e) {
    console.log(e);
    res.status(500).send(errorMessages.symbol.priceNotFound);
  }
});

stocks.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    const resp = await axiosInstance.get(`stocks/search?query=${query}`);
    if (resp.status === 200) {
      res.status(200).send(resp.data);
    } else {
      res.status(200).send([]);
    }
  } catch (error) {
    throw error;
  }
});

export default stocks;
