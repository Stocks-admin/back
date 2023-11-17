import moment from "moment";

export function processExchangeRates(rates) {
  const processedRates = {};
  for (const rate of rates) {
    processedRates[moment(rate.date).format("DD-MM-YYYY")] = rate.value;
  }
  return processedRates;
}
