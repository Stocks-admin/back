import axios from "axios";
import { dolarTypesApi } from "../constants/dolarTypeApi.js";

export async function getCurrentDolarValue(dolarType) {
  const dolar = await axios.get(dolarTypesApi[dolarType]);

  if (dolar.status !== 200) {
    throw new Error("An error ocurred.");
  }
  return {
    compra: dolar.data.compra,
    venta: dolar.data.venta,
  };
}
