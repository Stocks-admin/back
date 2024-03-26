import { PrismaClient } from "@prisma/client";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.ARGDATA_API_URL,
});

export async function getSymbolPrice(symbol, market = "nASDAQ") {
  try {
    const resp = await axiosInstance.get(
      `stocks/current-value/${symbol}?market=${market}`
    );
    if (resp.status === 200) {
      return {
        value: resp.data.value,
        type: resp.data.type,
        organization: resp.data.organization,
        bond_info: resp.data.bond,
      };
    } else {
      throw new Error("Error al obtener el precio del simbolo");
    }
  } catch (error) {
    throw error;
  }
}

export async function getMultiSymbolPrice(symbolsArray) {
  try {
    let symbols = [];
    let markets = [];
    symbolsArray.forEach((symbol) => {
      symbols.push(symbol.symbol);
      markets.push(symbol.market);
    });
    return axiosInstance
      .get("stocks/multi-current-value", {
        params: { symbols: symbols.join(","), markets: markets.join(",") },
      })
      .then((resp) => {
        if (resp.status === 200) {
          return resp.data;
        } else {
          return [];
        }
      })
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    throw error;
  }
}

export async function getSymbolPriceOnDate(symbol, market = "nASDAQ", date) {
  try {
    const resp = await axiosInstance.get(
      `stocks/stock-on-date/${symbol}?market=${market}&date=${date}`
    );
    if (resp.status === 200) {
      return resp.data;
    } else {
      throw new Error("Error al obtener el precio del simbolo");
    }
  } catch (error) {
    throw error;
  }
}

export async function getSymbolPriceBetweenDates(
  symbol,
  market = "nASDAQ",
  dateFrom,
  dateTo
) {
  try {
    const resp = await axiosInstance.get(
      `stocks/stock-on-date-range/${symbol}?market=${market}&dateFrom=${dateFrom}&dateTo=${dateTo}`
    );
    if (resp.status === 200) {
      return resp.data;
    } else {
      throw new Error("Error al obtener el precio del simbolo");
    }
  } catch (error) {
    throw error;
  }
}

export async function updateSymbolType(symbol, newType) {
  //TODO
}

export async function doesSymbolExist(symbol) {
  try {
    const resp = await axiosInstance.get(`stocks/${symbol}`);
    if (resp.status === 200) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

export async function filterNonExistentSymbols(symbols) {
  try {
    const resp = await axiosInstance.post(`stocks/verifyStocks`, {
      symbols,
    });
    if (resp.status === 200) {
      return resp.data;
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
}

export async function getRandomSymbol(limit = 10) {
  try {
    const resp = await axiosInstance.get(`stocks/random-stocks?limit=${limit}`);
    if (resp.status === 200) {
      return resp.data;
    } else {
      throw new Error("Error al obtener simbolos");
    }
  } catch (error) {
    throw error;
  }
}

export async function getSymbolBatch(symbol) {
  try {
    const resp = await axiosInstance.get(`stocks/batch`, {
      symbol,
    });
    console.log("resp", resp);
    if (resp.status === 200 && resp.data.batch) {
      return resp.data.batch;
    } else {
      return 1;
    }
  } catch (error) {
    return 1;
  }
}
