import { Market, PrismaClient } from "@prisma/client";
import {
  doesSymbolExist,
  filterNonExistentSymbols,
  getSymbolBatch,
  getSymbolPrice,
} from "./symbolController.js";
import {
  calculateModes,
  calculatePPP,
  isTransactionValid,
} from "../helpers/transactionHelpers.js";
import errorMessages from "../constants/errorMessages.js";
import { convertToUsd } from "../helpers/currencyHelpers.js";
import moment from "moment";
import { updateUserSnapshotsFromDate } from "./userController.js";

const db = new PrismaClient();

export async function getAllTransactions() {
  return await db.transactions.findMany();
}

export async function getUserTransactions(
  user_id,
  offset = 0,
  limit,
  dateFrom,
  dateTo,
  symbol
) {
  const whereConditions = {
    user_id: user_id,
  };
  if (symbol) {
    whereConditions.symbol = symbol;
  }
  const from = moment(dateFrom).toDate();
  const to = moment(dateTo).toDate();

  if (from && to && from < to && from < new Date()) {
    whereConditions.transaction_date = {
      gte: from,
      lte: to,
    };
  }
  const transactions = await db.transactions.findMany({
    where: whereConditions,
    orderBy: { transaction_date: "desc" },
    // skip: offset,
    // take: limit,
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

  const finalTransactions = await Promise.all(promises);
  const transactionAmount = await db.transactions.count({
    where: whereConditions,
  });
  return {
    transactions: finalTransactions,
    total: transactionAmount,
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
    const symbolBatch = await getSymbolBatch(transactionInfo.symbol);
    const { currency, ...restTransactionInfo } = transactionInfo;
    const symbolPrice =
      currency && currency === "ARS"
        ? await convertToUsd(
            transactionInfo.symbol_price,
            transactionInfo.transaction_date
          )
        : transactionInfo.symbol_price;

    const data = {
      ...restTransactionInfo,
      user_id,
      market: Market[transactionInfo.market.toUpperCase()] || Market.NASDAQ,
      symbol_price: symbolPrice / symbolBatch,
    };
    return await db.transactions.create({
      data: {
        ...data,
      },
    });
  } catch (error) {
    console.log(error);
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
      COALESCE(SUM(amount_sold * symbol_price) / SUM(amount_sold), 1) AS average_price
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
      COALESCE(SUM(amount_sold * symbol_price) / NULLIF(SUM(amount_sold), 0), 1) AS average_price
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

export async function massiveLoadTransactions(user_id, transactionsFile) {
  try {
    transactionsFile.shift().filter((transaction) => transaction.length > 0);
    if (transactionsFile.length === 0) {
      throw new Error(errorMessages.massiveTransaction.emptyFile);
    }
    const symbols = transactionsFile.map((transaction) => transaction[1]);
    const existentSymbols = await filterNonExistentSymbols(symbols);
    if (!existentSymbols || existentSymbols.length === 0) {
      throw new Error(errorMessages.massiveTransaction.invalidFile);
    }
    const parsedTransactions = transactionsFile
      .filter((transaction) => {
        if (transaction.length < 7) {
          return false;
        }
        const transaction_type = transaction[0];
        const symbol = transaction[1];
        const amount_sold = transaction[2];
        const symbolPrice = transaction[3];
        const market = transaction[5];
        const transaction_date = moment(
          (transaction[6] - 25569) * 86400 * 1000
        ).format();
        const isValid = isTransactionValid(
          transaction_type,
          symbol,
          amount_sold,
          symbolPrice,
          market,
          transaction_date
        );
        return existentSymbols.includes(symbol) && isValid;
      })
      .map(async (transaction) => {
        const transaction_type = transaction[0];
        const symbol = transaction[1];
        const amount_sold = transaction[2];
        const symbolPrice = transaction[3];
        const currency = transaction[4];
        const market = transaction[5];
        const transaction_date = moment(
          (transaction[6] - 25569) * 86400 * 1000
        ).format();
        const symbol_price =
          currency && currency === "ARS"
            ? await convertToUsd(symbolPrice, transaction_date)
            : symbolPrice;
        const symbolBatch = (await getSymbolBatch(symbol)) || 1;
        return {
          symbol,
          amount_sold,
          symbol_price: symbol_price / symbolBatch,
          transaction_type,
          market,
          transaction_date: moment(transaction_date).toDate(),
          user_id,
        };
      });

    const data = await Promise.all(parsedTransactions);

    const transactionsCreated = await db.transactions.createMany({
      data,
    });
    return transactionsCreated;
  } catch (error) {
    console.log(error);
    throw new Error(errorMessages.default);
  }
}

export const deleteTransaction = async (transactionId, user_id) => {
  let transaction;

  try {
    // Iniciar la transacción
    await db.$transaction(async (prisma) => {
      // Obtener la transacción
      transaction = await prisma.transactions.findUnique({
        where: { transaction_id: transactionId },
      });

      if (!transaction) {
        throw new Error(errorMessages.transaction.notFound);
      }

      if (transaction.user_id !== user_id) {
        throw new Error(errorMessages.transaction.invalidDelete);
      }

      const { transaction_date, symbol } = transaction;

      // Eliminar la transacción
      await prisma.transactions.delete({
        where: { transaction_id: transactionId },
      });

      // Actualizar los snapshots del usuario
      await updateUserSnapshotsFromDate(user_id, symbol, transaction_date);
    });

    // Si la transacción se realiza con éxito, retornar la transacción eliminada
    return transaction;
  } catch (error) {
    console.log(error);
    // En caso de error, revertir la transacción y lanzar la excepción
    if (transaction) {
      // Recuperar la transacción original
      const originalTransaction = await db.transactions.findUnique({
        where: { transaction_id: transactionId },
      });

      if (!originalTransaction) {
        throw new Error(errorMessages.transaction.notFound);
      }

      // Restaurar la transacción original en la base de datos
      await db.transactions.create({
        data: originalTransaction,
      });
    }

    throw error;
  } finally {
    // Cerrar la conexión de la base de datos
    await db.$disconnect();
  }
};

export async function cleanUserTransactions(user_id) {
  try {
    await db.transactions.deleteMany({
      where: { user_id },
    });
  } catch (error) {
    console.log(error);
    throw new Error(errorMessages.default);
  }
}
