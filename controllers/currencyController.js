import axios from "axios";

const axiosInstance = axios.create({
  baseURL: `${process.env.ARGDATA_API_URL}`,
});

export async function getCurrentDollarValue() {
  try {
    const resp = await axiosInstance.get("dollar/current-dollar");
    if (resp.status === 200) {
      return resp.data;
    } else {
      throw new Error("Error al obtener el valor del dolar");
    }
  } catch (error) {
    throw error;
  }
}

export async function getDollarValueOnDate(date) {
  try {
    const resp = await axiosInstance.get(`dollar/dollar-on-date?date=${date}`);
    if (resp.status === 200) {
      return resp.data;
    } else {
      throw new Error("Error al obtener el valor del dolar");
    }
  } catch (error) {
    throw error;
  }
}

export async function getDollarValueBetweenDates(dateFrom, dateTo) {
  try {
    const resp = await axiosInstance.get(
      `dollar/dollar-on-date-range?dateFrom=${dateFrom}&dateTo=${dateTo}`
    );
    if (resp.status === 200) {
      return resp.data;
    } else {
      throw new Error("Error al obtener el valor del dolar");
    }
  } catch (error) {
    throw error;
  }
}

export async function getUvaValueOnDate(date) {
  try {
    const resp = await axiosInstance.get(`metrics/uva-on-date?date=${date}`);
    if (resp.status === 200) {
      return resp.data;
    } else {
      throw new Error("Error al obtener el valor del uva");
    }
  } catch (error) {
    throw error;
  }
}

export async function getUvaValueBetweenDates(dateFrom, dateTo) {
  try {
    const resp = await axiosInstance.get(
      `metrics/uva-on-date-range?dateFrom=${dateFrom}&dateTo=${dateTo}`
    );
    if (resp.status === 200) {
      return resp.data;
    } else {
      throw new Error("Error al obtener el valor del uva");
    }
  } catch (error) {
    throw error;
  }
}
