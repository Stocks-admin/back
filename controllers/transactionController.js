import { PrismaClient } from "@prisma/client";
import { doesSymbolExist, getSymbolPrice } from "./symbolController.js";
import { calculateModes, calculatePPP } from "../helpers/transactionHelpers.js";
import errorMessages from "../constants/errorMessages.js";

const db = new PrismaClient();

export async function getAllTransactions() {
  return await db.transactions.findMany();
}

export async function getUserTransactions(
  user_id,
  offset = 0,
  limit,
  dateFrom,
  dateTo
) {
  const whereConditions = {
    user_id: user_id,
  };

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  if (from && to && from < to && from < new Date()) {
    whereConditions.transaction_date = {
      gte: from,
      lte: to,
    };
  }

  const transactions = await db.transactions.findMany({
    where: whereConditions,
    orderBy: { transaction_date: "desc" },
    skip: offset,
    take: limit,
  });

  const promises = transactions.map(async (transaction) => {
    if (transaction.transaction_type === "sell") {
      return {
        ...transaction,
        variation: await calculateModes(
          transaction.user_id,
          transaction.symbol
        ),
      };
    } else {
      return transaction;
    }
  });

  const finalTransactinos = await Promise.all(promises);
  return {
    transactions: finalTransactinos,
    total: finalTransactinos.length,
  };
}

export async function getUserTotalTransactions(user_id) {
  return await db.transactions.count({
    where: { user_id },
  });
}

export async function createTransaction(transactionInfo, user_id) {
  try {
    const symbolExist = await doesSymbolExist(transactionInfo.symbol);
    if (!symbolExist) {
      throw new Error(errorMessages.symbol.notFound);
    }
    const data = {
      ...transactionInfo,
      market: transactionInfo.market.toUpperCase(),
      user_id,
    };

    return await db.transactions.create({
      data,
    });
  } catch (error) {
    throw new Error(errorMessages.default);
  }
}

export async function updatePortfolioTable() {
  await db.$queryRaw`
    CREATE TEMPORARY TABLE tmp_user_portfolio_updates AS
      SELECT * FROM user_portfolio_snapshots;
    `;

  await db.$queryRaw`
    UPDATE user_portfolio up
      JOIN tmp_user_portfolio_updates tmp
        ON up.user_id = tmp.user_id AND up.symbol = tmp.symbol
        SET up.amount = up.amount + tmp.amount,
            up.updated_at = NOW();
    `;

  await db.$queryRaw`DROP TEMPORARY TABLE IF EXISTS tmp_user_portfolio_updates;`;
}

export async function getSymbolAveragePrice(symbol, user_id) {
  //Se utiliza para calcular el PPP del simbolo
  const averagePrice = await db.$queryRaw`
    SELECT
      COALESCE(SUM(amount_sold * symbol_price) / SUM(amount_sold), 0) AS average_price
    FROM
      transactions
    WHERE
      user_id = ${user_id} AND symbol = ${symbol} AND transaction_type = 'buy';
  `;

  return averagePrice[0].average_price;
}

export async function getPortfolioAveragePrice(user_id) {
  //Se utiliza para calcular el PPP del portfolio
  const averagePrice = await db.$queryRaw`
    SELECT
      symbol,
      market,
      COALESCE(SUM(amount_sold * symbol_price) / SUM(amount_sold), 0) AS average_price
    FROM
      transactions
    WHERE
      user_id = ${user_id} AND transaction_type = 'buy'
    GROUP BY
      symbol, market;
  `;
  if (averagePrice.length > 0) {
    return averagePrice.reduce((acc, item) => {
      // Convierte el mercado a minúsculas para el formato de clave
      const marketKey = item.market.toLowerCase();

      // Si el símbolo ya existe en el acumulador, solo añade el mercado y el precio
      if (acc[item.symbol]) {
        acc[item.symbol][marketKey] = item.average_price;
      } else {
        // Si el símbolo no existe, crea un nuevo objeto
        acc[item.symbol] = { [marketKey]: item.average_price };
      }

      return acc;
    }, {});
  }
  return [];
}
