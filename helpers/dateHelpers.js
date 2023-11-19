import moment from "moment";

const yesterday = moment().subtract(1, "days").format("DD-MM-YYYY");

export const benchmarkInterval = {
  weekly: {
    startDate: moment().subtract(7, "days").format("DD-MM-YYYY"),
    endDate: yesterday,
  },
  monthly: {
    startDate: moment().subtract(30, "days").format("DD-MM-YYYY"),
    endDate: yesterday,
  },
  quarterly: {
    startDate: moment().subtract(90, "days").format("DD-MM-YYYY"),
    endDate: yesterday,
  },
  yearly: {
    startDate: moment().subtract(360, "days").format("DD-MM-YYYY"),
    endDate: yesterday,
  },
};
