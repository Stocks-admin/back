import express from "express";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";
import currencies from "./routes/currencyRoutes.js";
import stocks from "./routes/stockRoutes.js";
import transactions from "./routes/transactionRoutes.js";
import user from "./routes/userRoutes.js";
import auth from "./routes/authRoutes.js";

const db = new PrismaClient();
const app = express();

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://development.d2jiei2auzx96a.amplifyapp.com/"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Origin"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
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
app.use("/auth", auth);

app.get("/test-db", (req, res) => {
  db.$queryRaw`SELECT 1 + 1 AS result;`
    .then((data) => {
      res.send(data);
    })
    .catch((e) => {
      res.status(500).send(e.toString());
    });
});

app.get("/add-to-db-test", async (req, res) => {
  db.$queryRaw`CREATE TABLE Persons (
      PersonID int,
      LastName varchar(255),
      FirstName varchar(255),
      Address varchar(255),
      City varchar(255)
    );`
    .then((data) => {
      res.send(data);
    })
    .catch((e) => {
      res.status(500).send(e.toString());
    });
});

app.listen(process.env.PORT || process.env.SERVER_PORT || 3001, () => {
  console.log("Press CTRL-C to stop");
});
