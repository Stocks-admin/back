import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import currencies from "./routes/currencyRoutes.js";
import stocks from "./routes/stockRoutes.js";
import transactions from "./routes/transactionRoutes.js";
import user from "./routes/userRoutes.js";
import auth from "./routes/authRoutes.js";

const db = new PrismaClient();
const app = express();

const corsOptions = {
  origin: [
    "https://development.d2jiei2auzx96a.amplifyapp.com",
    "https://production.d2jiei2auzx96a.amplifyapp.com",
  ],
  optionsSuccessStatus: 200,
  methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));
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

app.listen(process.env.PORT || process.env.SERVER_PORT || 3001, () => {
  console.log("Press CTRL-C to stop");
});
