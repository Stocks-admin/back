import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import currencies from "./routes/currencyRoutes.js";
import stocks from "./routes/stockRoutes.js";
import transactions from "./routes/transactionRoutes.js";
import user from "./routes/userRoutes.js";
import auth from "./routes/authRoutes.js";
import { getRandomSymbol } from "./controllers/symbolController.js";
import { isAuthenticated } from "./middlewares.js";
import jwt from "jsonwebtoken";

const db = new PrismaClient();
const app = express();

const corsOptions = {
  origin: [
    "https://development.d2jiei2auzx96a.amplifyapp.com",
    "https://production.d2jiei2auzx96a.amplifyapp.com",
    "http://localhost:3000",
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

app.post("/fake-transactions", isAuthenticated, async (req, res) => {
  try {
    const { amount } = req.body;
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
    const symbols = await getRandomSymbol(amount);
    symbols.forEach(async (symbol) => {
      const amount = Math.floor(Math.random() * 100);
      await db.transactions.create({
        data: {
          symbol: symbol.stock_symbol,
          amount_sold: amount,
          symbol_price: Math.floor(Math.random() * 100),
          transaction_date: new Date(),
          transaction_type: "buy",
          market: symbol.market,
          user_id: payload.userId,
        },
      });
      //50% de probabilidad de que se cree una venta y se venda menos cantidad de la que se compro
      if (Math.random() > 0.5) {
        await db.transactions.create({
          data: {
            symbol: symbol.stock_symbol,
            amount_sold: Math.floor(Math.random() * amount),
            symbol_price: Math.floor(Math.random() * 100),
            transaction_date: new Date(),
            transaction_type: "sell",
            market: symbol.market,
            user_id: payload.userId,
          },
        });
      }
    });
    res.status(200).send("OK");
  } catch (error) {
    console.log("Error: ", error);
    res.status(500).send(error.toString());
  }
});

app.listen(process.env.PORT || process.env.SERVER_PORT || 3001, () => {
  console.log("Press CTRL-C to stop");
});
