import { Market, PrismaClient } from "@prisma/client";
import { doesSymbolExist } from "../controllers/symbolController.js";

const db = new PrismaClient();

export async function calculatePPP(user_id, symbol) {
  const query = await db.$queryRaw`
    SELECT
        SUM(amount_sold * symbol_price) / SUM(amount_sold) AS PPP
    FROM
        transactions
    WHERE
        user_id = ${user_id} AND symbol = ${symbol} AND transaction_type = 'buy';
    `;

  return query[0].PPP;
}

export async function calculateModes(user_id, symbol) {
  const query = await db.$queryRaw`
    SELECT
      COALESCE(
        SUM(CASE WHEN transaction_type = 'sell' THEN (amount_sold * symbol_price) END) 
        / NULLIF(SUM(amount_sold), 0), 
        0
      ) AS PPP
    FROM transactions
    WHERE user_id = ${user_id} AND symbol = ${symbol} AND transaction_type = 'sell';
  `;
  if (!query || query.length === 0) {
    return 0;
  }
  return query[0].ppp;
}

export async function calculateModesForAllUsersAndSymbols() {
  const query = await db.$queryRaw`
    SELECT
      user_id,
      symbol,
      SUM(CASE WHEN transaction_type = 'buy' THEN (amount_sold * symbol_price) / amount_sold END) / SUM(amount_sold) AS PPP
    FROM transactions
    WHERE transaction_type = 'buy'
    GROUP BY user_id, symbol;
  `;

  return query;
}

export async function isTransactionValid(
  transaction_type,
  symbol,
  amount_sold,
  symbol_price,
  market,
  transaction_date
) {
  if (!symbol || !market || !Market[market.toUpperCase()]) {
    return false;
  }

  if (transaction_type !== "buy" && transaction_type !== "sell") {
    return false;
  }

  if (isNaN(parseInt(amount_sold) || parseInt(amount_sold) <= 0)) {
    return false;
  }

  if (isNaN(parseFloat(symbol_price) || parseFloat(symbol_price) < 0)) {
    return false;
  }

  if (transaction_date) {
    console.log(transaction_date);
    const parsedDate = Date.parse(transaction_date);
    if (isNaN(parsedDate) || parsedDate > Date.now()) {
      console.log(parsedDate);
      return false;
    }
  } else {
    return false;
  }

  return true;
}
