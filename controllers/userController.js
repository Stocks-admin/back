import { PrismaClient } from "@prisma/client";
import { getSymbolPrice } from "./symbolController.js";
import { calculateModes } from "../helpers/transactionHelpers.js";

const db = new PrismaClient();

export async function getUserWallet(user_id) {
  try {
    const wallet = await db.user_wallet.findFirst({
      where: {
        user_id,
      },
    });

    const newTransactions = await db.user_wallet_updates.findMany({
      where: {
        user_id,
      },
    });

    const newAmount =
      newTransactions?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

    return {
      user_id,
      amount: wallet.amount + newAmount,
    };
  } catch (error) {
    throw new Error(error);
  }
}

export async function getUserPortfolio(user_id) {
  try {
    db.$queryRaw`DROP TEMPORARY TABLE IF EXISTS tmp_user_portfolio_updates;`;

    await db.$queryRaw`
      CREATE TEMPORARY TABLE tmp_user_portfolio_updates AS
        SELECT * FROM user_portfolio_updates;
      `;

    const portfolio = await db.$queryRaw`
      SELECT
          up.user_id,
          up.symbol,
          (up.amount + COALESCE(upd.amount, 0)) AS final_amount
      FROM
          user_portfolio up
      LEFT JOIN
          user_portfolio_updates upd
      ON
          up.user_id = upd.user_id AND up.symbol = upd.symbol
      WHERE
          up.user_id = ${user_id};

    `;

    await db.$queryRaw`DROP TEMPORARY TABLE IF EXISTS tmp_user_portfolio_updates;`;

    const updatedPortfolio = await Promise.all(
      portfolio.map(async (stock) => {
        const current_price = await getSymbolPrice(stock.symbol);
        return {
          ...stock,
          current_price: parseInt(current_price.price) || 0,
          variation: await calculateModes(user_id, stock.symbol),
        };
      })
    );

    return updatedPortfolio;
  } catch (error) {
    throw new Error(error);
  }
}

export async function getUserInfo(user_id) {
  try {
    const wallet = await getUserWallet(user_id);
    const portfolio = await getUserPortfolio(user_id);

    return {
      wallet,
      portfolio,
    };
  } catch (error) {
    throw new Error(error);
  }
}
