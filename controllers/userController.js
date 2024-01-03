import { PrismaClient } from "@prisma/client";
import { getSymbolPrice, getSymbolPriceOnDate } from "./symbolController.js";
import { calculateModes } from "../helpers/transactionHelpers.js";
import { benchmarkInterval } from "../helpers/dateHelpers.js";
import {
  getCurrentDollarValue,
  getDollarValueBetweenDates,
  getDollarValueOnDate,
  getUvaValueBetweenDates,
  getUvaValueOnDate,
} from "./currencyController.js";
import { processExchangeRates } from "../helpers/currencyHelpers.js";
import moment from "moment";
import {
  getPortfolioAveragePrice,
  getSymbolAveragePrice,
} from "./transactionController.js";
import user from "../routes/userRoutes.js";

const db = new PrismaClient();

export async function getUserPortfolio(user_id) {
  try {
    // DROP TEMPORARY TABLE IF EXISTS en PostgreSQL
    await db.$queryRaw`DROP TABLE IF EXISTS tmp_user_portfolio_updates;`;

    // CREATE TEMPORARY TABLE en PostgreSQL
    await db.$queryRaw`
      CREATE TEMPORARY TABLE tmp_user_portfolio_updates AS
        SELECT * FROM portfolio_snapshots;
    `;

    const portfolio = await db.$queryRaw`
      WITH AggregatedSnapshots AS (
          SELECT
              user_id,
              symbol,
              market,
              SUM(amount) AS total_snapshot_amount
          FROM
              portfolio_snapshots
          GROUP BY
              user_id,
              symbol,
              market
      )
      SELECT
          COALESCE(aggr.user_id, upd.user_id) AS user_id,
          COALESCE(aggr.symbol, upd.symbol) AS symbol,
          COALESCE(aggr.market, upd.market) AS market,
          (COALESCE(aggr.total_snapshot_amount, 0) + COALESCE(upd.amount, 0)) AS final_amount
      FROM
          AggregatedSnapshots aggr
      FULL JOIN
          portfolio_snapshots_updates upd
      ON
          aggr.user_id = upd.user_id AND aggr.symbol = upd.symbol
      WHERE
          COALESCE(aggr.user_id, upd.user_id) = ${user_id}
      ORDER BY
          COALESCE(aggr.symbol, upd.symbol) ASC;
    `;

    // DROP TEMPORARY TABLE IF EXISTS en PostgreSQL
    await db.$queryRaw`DROP TABLE IF EXISTS tmp_user_portfolio_updates;`;
    const portfolioPurchasePrice = await getPortfolioAveragePrice(user_id);
    const updatedPortfolio = await Promise.all(
      portfolio.map(async (stock) => {
        const current_price = await getSymbolPrice(stock.symbol, stock.market);
        return {
          ...stock,
          organization: current_price.organization,
          current_price: current_price.price || 0,
          purchase_price:
            portfolioPurchasePrice[stock.symbol][stock.market.toLowerCase()] ||
            0,
        };
      })
    );
    return updatedPortfolio;
  } catch (error) {
    return [];
  }
}

export async function generateSnapshots() {
  try {
    // Paso 1: Obtener la última snapshot para cada user_id y symbol
    const latestSnapshots = await prisma.$queryRaw`
      SELECT user_id, symbol, MAX(date) AS latest_snapshot_date, amount AS latest_snapshot_amount
      FROM portfolio_snapshots
      GROUP BY user_id, symbol;
    `;

    for (const snapshot of latestSnapshots) {
      const { user_id, symbol, latest_snapshot_date, latest_snapshot_amount } =
        snapshot;

      // Paso 2: Sumar todas las actualizaciones posteriores para cada user_id y symbol
      const updatesSum = await prisma.tmp_user_portfolio_updates.aggregate({
        where: {
          userId: user_id,
          symbol: symbol,
          date: {
            gt: latest_snapshot_date,
          },
        },
        sum: {
          amount: true,
        },
      });

      // Paso 3: Crear una nueva snapshot para cada user_id y symbol
      const newAmount = latest_snapshot_amount + (updatesSum.sum.amount || 0);
      await prisma.portfolio_snapshots.create({
        data: {
          userId: user_id,
          symbol: symbol,
          date: new Date(), // Asumiendo que la fecha de la nueva snapshot es la fecha actual
          amount: newAmount,
        },
      });
    }
  } catch (error) {
  } finally {
    await prisma.$disconnect();
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

export async function getUserPortfolioValueOnDate(user_id, date) {
  try {
    //get last snapshot before date
    const lastSnapshot = await db.portfolio_snapshots.findFirst({
      where: {
        user_id,
        date: {
          lte: moment(date, "DD-MM-YYYY").toDate(),
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    //get transactions between last snapshot and date
    const newTransactions = await db.transactions.findMany({
      where: {
        user_id,
        transaction_date: {
          gte: lastSnapshot?.date
            ? lastSnapshot.date
            : moment("01-01-1970", "DD-MM-YYYY").toDate(),
          lte: moment(date, "DD-MM-YYYY").toDate(),
        },
      },
    });

    //calculate final portfolio on date
    const portfolio = newTransactions.reduce((acc, curr) => {
      const index = acc.findIndex((item) => item.symbol === curr.symbol);
      if (index >= 0) {
        acc[index].amount += curr.amount_sold;
      } else {
        acc.push({
          symbol: curr.symbol,
          amount: curr.amount_sold,
          market: curr.market,
        });
      }
      return acc;
    }, lastSnapshot?.portfolio || []);

    const portfolioValue = await Promise.all(
      portfolio.map(async (stock) => {
        const current_price = await getSymbolPriceOnDate(
          stock.symbol,
          stock?.market,
          date
        );
        return {
          ...stock,
          current_price: parseInt(current_price.value) || 0,
        };
      })
    );
    return portfolioValue.reduce(
      (acc, curr) => acc + curr.current_price * curr.amount,
      0
    );
  } catch (error) {
    console.log("Error: ", error);
    return 0;
  }
}

export async function getUserInfo(user_id) {
  try {
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
      portfolio,
    };
  } catch (error) {
    throw new Error(error);
  }
}

export async function getUserBenchmark(user_id, interval = "weekly") {
  const intervalSeeked =
    benchmarkInterval[interval] || benchmarkInterval.weekly;
  try {
    const portfolioValuesPromises = await Promise.all([
      getUserPortfolioValueOnDate(user_id, intervalSeeked.startDate),
      getUserPortfolioValueOnDate(user_id, intervalSeeked.endDate),
    ]);

    const portfolioValues = {
      start: portfolioValuesPromises[0],
      end: portfolioValuesPromises[1],
    };

    const benchmarks = await Promise.all([
      getDollarBenchmark(intervalSeeked, portfolioValues),
      getUvaBenchmark(intervalSeeked, portfolioValues),
    ]);

    return {
      dollar: benchmarks[0],
      uva: benchmarks[1],
    };
  } catch (error) {
    return {
      dollar: 0,
      uva: 0,
    };
  }
}

async function getDollarBenchmark(interval, portfolioValues) {
  try {
    const dollarValuesPromise = await Promise.all([
      getDollarValueOnDate(interval.startDate),
      getDollarValueOnDate(interval.endDate),
    ]);

    const dollarValues = {
      start: dollarValuesPromise[0],
      end: dollarValuesPromise[1],
    };

    const dollarVariation =
      ((dollarValues?.end?.value - dollarValues?.start?.value) /
        dollarValues?.start?.value) *
      100;
    const portfolioVariation =
      ((portfolioValues.end - portfolioValues.start) / portfolioValues.start) *
        100 || 0;
    return portfolioVariation - dollarVariation;
  } catch (error) {
    return 0;
  }
}

async function getUvaBenchmark(interval, portfolioValues) {
  try {
    const uvaValues = {
      start: await getUvaValueOnDate(interval.startDate),
      end: await getUvaValueOnDate(interval.endDate),
    };
    const uvaVariation =
      ((uvaValues?.end?.value - uvaValues?.start?.value) /
        uvaValues?.start?.value) *
        100 || 0;
    const portfolioVariation =
      ((portfolioValues.end - portfolioValues.start) / portfolioValues.start) *
        100 || 0;
    return portfolioVariation - uvaVariation;
  } catch (error) {
    console.log("Error: ", error);
    return 0;
  }
}
