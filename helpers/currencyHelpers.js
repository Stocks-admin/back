import moment from "moment";
import {
  getCurrentDollarValue,
  getDollarValueOnDate,
} from "../controllers/currencyController.js";

export function processExchangeRates(rates) {
  const processedRates = {};
  for (const rate of rates) {
    processedRates[moment(rate.date).format("DD-MM-YYYY")] = rate.value;
  }
  return processedRates;
}

export async function convertToUsd(amount, date = moment()) {
  if (!amount) return 1;
  let exchangeRate = 1;
  if (date.isAfter(moment().startOf("day"))) {
    exchangeRate = (await getCurrentDollarValue(date)).value;
  } else {
    exchangeRate = (await getDollarValueOnDate(date.format("YYYY-MM-DD")))
      .value;
  }
  return amount / exchangeRate;
}
