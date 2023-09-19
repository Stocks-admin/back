import express from "express";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";
import currencies from "./routes/currencyRoutes.js";
import stocks from "./routes/stockRoutes.js";
import transactions from "./routes/transactionRoutes.js";
import { calculateFIFO, calculateLIFO } from "./helpers/transactionHelpers.js";
import user from "./routes/userRoutes.js";

const db = new PrismaClient();
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

app.get("/checkDB", (req, res) => {
  db.$queryRaw`SELECT 1 + 1 AS result;`
    .then((data) => {
      res.send(data);
    })
    .catch((e) => {
      res.status(500).send(e.toString());
    });
});

app.listen(3000, () => {
  console.log("Press CTRL-C to stop");
});
