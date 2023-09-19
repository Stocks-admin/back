import { PrismaClient } from "@prisma/client";
import { getSymbolPrice } from "./symbolController.js";
import {
  calculateFIFO,
  calculateLIFO,
  calculateModes,
  calculatePPP,
} from "../helpers/transactionHelpers.js";

const db = new PrismaClient();

export async function getAllTransactions() {
  return await db.transactions.findMany();
}

export async function getUserTransactions(user_id, offset = 0, limit) {
  const transactions = await db.transactions.findMany({
    where: { user_id },
    orderBy: { transaction_date: "desc" },
    skip: offset,
    take: limit,
  });

  const promises = transactions.map(async (transaction) => {
    if (
      transaction.transaction_type === "buy" ||
      transaction.transaction_type === "sell"
    ) {
      return {
        ...transaction,
        variations: await calculateModes(
          transaction.user_id,
          transaction.symbol
        ),
      };
    } else {
      return transaction;
    }
  });

  return await Promise.all(promises);
}

export async function createTransaction(data) {
  return await db.transactions.create({
    data,
  });
}

export async function updatePortfolioTable() {
  await db.$queryRaw`
    CREATE TEMPORARY TABLE tmp_user_portfolio_updates AS
      SELECT * FROM user_portfolio_updates;
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
