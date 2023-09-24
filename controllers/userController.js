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
      amount: (wallet?.amount || 0) + newAmount,
    };
  } catch (error) {
    throw new Error(error);
  }
}

export async function getUserPortfolio(user_id) {
  try {
    // DROP TEMPORARY TABLE IF EXISTS en PostgreSQL
    await db.$queryRaw`DROP TABLE IF EXISTS tmp_user_portfolio_updates;`;

    // CREATE TEMPORARY TABLE en PostgreSQL
    await db.$queryRaw`
      CREATE TEMPORARY TABLE tmp_user_portfolio_updates AS
        SELECT * FROM user_portfolio_updates;
    `;

    const portfolio = await db.$queryRaw`
      SELECT
          COALESCE(up.user_id, upd.user_id) AS user_id,
          COALESCE(up.symbol, upd.symbol) AS symbol,
          (COALESCE(up.amount, 0) + COALESCE(upd.amount, 0)) AS final_amount
      FROM
          user_portfolio up
      FULL JOIN
          tmp_user_portfolio_updates upd
      ON
          up.user_id = upd.user_id AND up.symbol = upd.symbol
      WHERE
          COALESCE(up.user_id, upd.user_id) = ${user_id};
`;

    // DROP TEMPORARY TABLE IF EXISTS en PostgreSQL
    await db.$queryRaw`DROP TABLE IF EXISTS tmp_user_portfolio_updates;`;

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

export async function getUserPortfolioValue(user_id) {
  try {
    const portfolio = await getUserPortfolio(user_id);
    const portfolioValue = portfolio.reduce(
      (acc, curr) => acc + curr.current_price * curr.final_amount,
      0
    );
    return portfolioValue;
  } catch (error) {
    return 0;
  }
}

export async function getUserInfo(user_id) {
  try {
    const wallet = await getUserWallet(user_id);
    const portfolio = await getUserPortfolioValue(user_id);
    const userInfo = await db.user.findUnique({
      where: {
        user_id,
      },
      select: {
        user_id: true,
        email: true,
      },
    });

    return {
      info: { ...userInfo },
      wallet,
      portfolio,
    };
  } catch (error) {
    throw new Error(error);
  }
}
