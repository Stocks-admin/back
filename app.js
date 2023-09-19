import express from "express";
import bodyParser from "body-parser";
import currencies from "./routes/currencyRoutes.js";
import stocks from "./routes/stockRoutes.js";
import transactions from "./routes/transactionRoutes.js";
import { calculateFIFO, calculateLIFO } from "./helpers/transactionHelpers.js";
import user from "./routes/userRoutes.js";

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Origin"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("OK");
});

app.use("/currencies", currencies);
app.use("/stocks", stocks);
app.use("/transactions", transactions);
app.use("/user", user);

app.get("/testVariation", (req, res) => {
  const test = calculateLIFO(1, "MELI");
  res.status(200).send(test);
});

app.get("/testVariation2", (req, res) => {
  const test = calculateFIFO(1, "MELI");
  res.status(200).send(test);
});

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("Press CTRL-C to stop");
});
