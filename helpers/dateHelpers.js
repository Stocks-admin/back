import moment from "moment";

const yesterday = moment().subtract(1, "days").format("YYYY-MM-DD");

export const benchmarkInterval = {
  weekly: {
    startDate: moment().subtract(7, "days").format("YYYY-MM-DD"),
    endDate: yesterday,
  },
  monthly: {
    startDate: moment().subtract(30, "days").format("YYYY-MM-DD"),
    endDate: yesterday,
  },
  quarterly: {
    startDate: moment().subtract(90, "days").format("YYYY-MM-DD"),
    endDate: yesterday,
  },
  yearly: {
    startDate: moment().subtract(360, "days").format("YYYY-MM-DD"),
    endDate: yesterday,
  },
};
