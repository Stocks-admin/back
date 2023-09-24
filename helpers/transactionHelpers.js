import { PrismaClient } from "@prisma/client";

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

export async function calculateFIFO(user_id, symbol) {
  const query = await db.transactions.findFirst({
    select: {
      symbol_price: true,
    },
    where: {
      AND: [{ user_id }, { symbol }, { transaction_type: "buy" }],
    },
    orderBy: {
      transaction_date: "asc",
    },
  });
  return query.symbol_price;
}

export async function calculateLIFO(user_id, symbol) {
  const query = await db.transactions.findFirst({
    select: {
      symbol_price: true,
    },
    where: {
      AND: [{ user_id }, { symbol }, { transaction_type: "buy" }],
    },
    orderBy: {
      transaction_date: "desc",
    },
  });
  return query.symbol_price;
}

export async function calculateModes(user_id, symbol) {
  const query = await db.$queryRaw`
    SELECT
      COALESCE(MIN(CASE WHEN transaction_type = 'sell' THEN symbol_price END), 0) AS LIFO,
      COALESCE(MAX(CASE WHEN transaction_type = 'sell' THEN symbol_price END), 0) AS FIFO,
      COALESCE(
        SUM(CASE WHEN transaction_type = 'sell' THEN (amount_sold * symbol_price) END) 
        / NULLIF(SUM(amount_sold), 0), 
        0
      ) AS PPP
    FROM transactions
    WHERE user_id = ${user_id} AND symbol = ${symbol} AND transaction_type = 'sell';
  `;
  if (!query || query.length === 0) {
    return {
      lifo: 0,
      fifo: 0,
      ppp: 0,
    };
  }
  return {
    lifo: query[0].lifo,
    fifo: query[0].fifo,
    ppp: query[0].ppp,
  };
}

export async function calculateModesForAllUsersAndSymbols() {
  const query = await db.$queryRaw`
    SELECT
      user_id,
      symbol,
      MAX(CASE WHEN transaction_type = 'buy' THEN symbol_price END) AS LIFO,
      MIN(CASE WHEN transaction_type = 'buy' THEN symbol_price END) AS FIFO,
      SUM(CASE WHEN transaction_type = 'buy' THEN (amount_sold * symbol_price) / amount_sold END) / SUM(amount_sold) AS PPP
    FROM transactions
    WHERE transaction_type = 'buy'
    GROUP BY user_id, symbol;
  `;

  return query;
}
