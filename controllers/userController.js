import { PrismaClient } from "@prisma/client";
import {
  getMultiSymbolPrice,
  getSymbolPrice,
  getSymbolPriceOnDate,
} from "./symbolController.js";
import { benchmarkInterval } from "../helpers/dateHelpers.js";
import {
  getDollarValueOnDate,
  getUvaValueOnDate,
} from "./currencyController.js";
import moment from "moment";
import { getPortfolioAveragePrice } from "./transactionController.js";

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
    const symbols = portfolio.map((stock) => ({
      symbol: stock.symbol,
      market: stock.market,
    }));
    const prices = await getMultiSymbolPrice(symbols);
    const updatedPortfolio = portfolio.map((stock) => {
      const current = prices.find((price) => price.symbol === stock.symbol);
      if (current) {
        return {
          ...stock,
          hasError: false,
          type: current.type,
          organization: current.organization,
          bond_info: current.bond,
          current_price: current.value || 0,
          purchase_price:
            portfolioPurchasePrice[stock.symbol][stock.market.toLowerCase()] ||
            0,
        };
      } else {
        return {
          ...stock,
          hasError: true,
          current_price: 0,
          purchase_price:
            portfolioPurchasePrice[stock.symbol][stock.market.toLowerCase()] ||
            0,
        };
      }
    });
    return updatedPortfolio;
  } catch (error) {
    return [];
  }
}

export async function generateSnapshots() {
  try {
    const updates = await db.portfolio_snapshots_updates.findMany();

    const snapshots = await db.portfolio_snapshots.findMany({
      where: {
        OR: updates.map((update) => ({
          user_id: update.user_id,
          symbol: update.symbol,
          market: update.market,
        })),
      },
    });

    const newSnapshots = updates.reduce((acc, curr) => {
      const index = acc.findIndex(
        (snapshot) =>
          snapshot.user_id === curr.user_id &&
          snapshot.symbol === curr.symbol &&
          snapshot.market === curr.market
      );
      if (index >= 0) {
        acc[index].amount += curr.amount;
        acc[index].date = moment().toDate();
      } else {
        acc.push({
          user_id: curr.user_id,
          symbol: curr.symbol,
          amount: curr.amount,
          market: curr.market,
          date: moment().toDate(),
        });
      }
      return acc;
    }, snapshots);

    await db.portfolio_snapshots.createMany({
      data: newSnapshots,
    });
  } catch (error) {
    throw new Error(error);
  }
}

export async function updateUserSnapshotsFromDate(user_id, symbol, date) {
  try {
    const transactions = await db.transactions.findMany({
      where: {
        user_id,
        symbol,
        transaction_date: {
          gte: moment(date, "DD-MM-YYYY").toDate(),
        },
      },
      orderBy: {
        transaction_date: "asc",
      },
    });

    const lastSnapshot = await db.portfolio_snapshots.findFirst({
      where: {
        user_id,
        symbol,
        date: {
          lte: moment(date, "DD-MM-YYYY").toDate(),
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const snapshotsAfter = await db.portfolio_snapshots.findMany({
      where: {
        user_id,
        symbol,
      },
      orderBy: {
        date: "asc",
      },
    });

    let lastSnapshotValue = lastSnapshot?.amount || 0;
    let lastSnapshotDate = lastSnapshot?.date || moment("1900-1-1").toDate();

    if (!transactions?.length) {
      //Delete all snapshots after date
      await db.portfolio_snapshots.deleteMany({
        where: {
          user_id,
          symbol,
          date: {
            gte: moment(date, "DD-MM-YYYY").toDate(),
          },
        },
      });
    }

    if (!snapshotsAfter?.length) return;

    const updatedSnapshots = snapshotsAfter.map((snapshot) => {
      const transactionBetweenSnapshots = transactions.filter((transaction) =>
        moment(transaction.transaction_date).isBetween(
          lastSnapshotDate,
          snapshot?.date
        )
      );

      const amount = transactionBetweenSnapshots.reduce(
        (acc, curr) =>
          curr.transaction_type === "buy"
            ? acc + curr.amount_sold
            : acc - curr.amount_sold,
        lastSnapshotValue
      );
      lastSnapshotValue = amount;
      lastSnapshotDate = snapshot?.date;

      return {
        ...snapshot,
        amount,
      };
    });

    //Update snapshots on DB
    return await db.portfolio_snapshots.updateMany({
      where: {
        user_id,
        symbol,
      },
      data: updatedSnapshots,
    });
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

export async function getUserPortfolioValueOnDate(user_id, date) {
  try {
    //get last snapshot before date
    const lastSnapshot = await db.portfolio_snapshots.findFirst({
      where: {
        user_id,
        date: {
          lte: moment(date).toDate(),
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
            : moment("1970-01-01").toDate(),
          lte: moment(date).toDate(),
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

  console.log("Interval seeked: ", intervalSeeked);
  try {
    const portfolioValuesPromises = await Promise.all([
      getUserPortfolioValueOnDate(user_id, intervalSeeked.startDate),
      getUserPortfolioValueOnDate(user_id, intervalSeeked.endDate),
    ]);

    const portfolioValues = {
      start: portfolioValuesPromises[0],
      end: portfolioValuesPromises[1],
    };
    console.log("Portfolio values: ", portfolioValues);
    if (
      !portfolioValues.start ||
      !portfolioValues.end ||
      (portfolioValues.start === 0 && portfolioValues.end === 0)
    )
      return { dollar: 0, uva: 0 };

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
    return 0;
  }
}
