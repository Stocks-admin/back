import { PrismaClient } from "@prisma/client";
import axios from "axios";
import finnhubClient from "../utils/finnhubClient.js";
import {
  fetchSymbolPriceByDateIOL,
  fetchSymbolPriceIOL,
} from "../utils/IOLClient.js";

const db = new PrismaClient();

export async function getSymbolPrice(symbol, market = "nASDAQ") {
  try {
    const db_symbol = await db.symbols.findFirst({
      where: {
        symbol,
      },
    });

    const timeDifferenceInDays =
      (new Date() - new Date(db_symbol?.updated_at)) / (1000 * 60 * 60 * 24);

    if (db_symbol && timeDifferenceInDays <= 1) {
      return { price: db_symbol.last_price };
    } else {
      const symbolPrice = await fetchSymbolPriceIOL(symbol, market);
      await db.symbols.upsert({
        where: {
          symbol,
        },
        create: {
          symbol,
          updated_at: new Date(),
          last_price: parseFloat(symbolPrice?.price),
        },
        update: {
          updated_at: new Date(),
          last_price: parseFloat(symbolPrice?.price),
        },
      });
      return { price: parseFloat(symbolPrice?.price) };
    }
  } catch (error) {
    console.log(error);
    throw new Error("An error ocurred.");
  }
}

export async function getSymbolPriceOnDate(symbol, market = "nASDAQ", date) {
  try {
    const symbolPrice = await fetchSymbolPriceByDateIOL(symbol, market, date);
    return { price: parseFloat(symbolPrice?.price) };
  } catch (error) {
    console.log(error);
    throw new Error("An error ocurred.");
  }
}
