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

export async function convertToUsd(amount, date = moment().format()) {
  if (!amount) return 1;
  let exchangeRate = 1;

  if (moment(date).isAfter(moment().startOf("day"))) {
    return getCurrentDollarValue(date)
      .then((resp) => {
        return amount / resp.value;
      })
      .catch(() => {
        return amount / exchangeRate;
      });
  } else {
    return getDollarValueOnDate(moment(date).format("YYYY-MM-DD"))
      .then((resp) => {
        return amount / resp.value;
      })
      .catch(() => {
        return amount / exchangeRate;
      });
  }
}
