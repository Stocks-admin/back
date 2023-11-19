import { PrismaClient } from "@prisma/client";
import axios from "axios";
import moment from "moment";

const db = new PrismaClient();

export const loginIOL = async () => {
  const logIn = await axios.post(
    "https://api.invertironline.com/token",
    {
      username: process.env.IOL_USERNAME,
      password: process.env.IOL_PASSWORD,
      grant_type: "password",
    },
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  if (logIn.status !== 200) throw new Error("Error al loguearse en IOL");
  await db.iol_token.upsert({
    where: {
      token_id: 1,
    },
    create: {
      token_id: 1,
      access_token: logIn.data.access_token,
      refresh_token: logIn.data.refresh_token,
      expires_at: moment().add(logIn.data.expires_in, "seconds").toDate(),
    },
    update: {
      access_token: logIn.data.access_token,
      refresh_token: logIn.data.refresh_token,
      expires_at: moment().add(logIn.data.expires_in, "seconds").toDate(),
    },
  });

  return {
    access_token: logIn.data.access_token,
    refresh_token: logIn.data.refresh_token,
  };
};

export const refreshIOL = async () => {
  const token = await db.iol_token.findUnique({
    where: {
      token_id: 1,
    },
  });
  if (!token) throw new Error("No se encontró token de IOL");
  const { refresh_token } = token;
  const newRefresh = await axios.post("https://api.invertironline.com/token", {
    refresh_token,
    grant_type: "refresh_token",
  });

  if (newRefresh.status !== 200) throw new Error("Error al refrescar token");
  await db.iol_token.update({
    where: {
      token_id: 1,
    },
    data: {
      access_token: newRefresh.data.access_token,
      refresh_token: newRefresh.data.refresh_token,
      expires_at: moment().add(newRefresh.data.expires_in, "seconds").toDate(),
    },
  });

  return {
    access_token: newRefresh.data.access_token,
    refresh_token: newRefresh.data.refresh_token,
  };
};

export const fetchSymbolPriceIOL = async (symbol, mercado = "nASDAQ") => {
  try {
    let access_token, expires_at;
    const currentToken = await db.iol_token.findUnique({
      where: {
        token_id: 1,
      },
    });

    if (!currentToken?.access_token || !currentToken?.expires_at) {
      const data = await loginIOL();
      access_token = data.access_token;
      expires_at = data.expires_at;
    } else {
      access_token = currentToken.access_token;
      expires_at = currentToken.expires_at;
    }

    if (moment().isAfter(moment(expires_at)))
      access_token = (await loginIOL()).access_token;

    const resp = await axios.get(
      `https://api.invertironline.com/api/v2/${mercado}/Titulos/${symbol}/Cotizacion`,
      {
        headers: {
          Authorization: `bearer ${access_token}`,
        },
      }
    );

    return { price: resp?.data?.ultimoPrecio || 0 };
  } catch (error) {
    throw new Error(error);
  }
};

export const fetchSymbolPriceByDateIOL = async (
  symbol,
  mercado = "nASDAQ",
  date
) => {
  try {
    let access_token, expires_at;
    const currentToken = await db.iol_token.findUnique({
      where: {
        token_id: 1,
      },
    });

    if (!currentToken?.access_token || !currentToken?.expires_at) {
      const data = await loginIOL();
      access_token = data.access_token;
      expires_at = data.expires_at;
    } else {
      access_token = currentToken.access_token;
      expires_at = currentToken.expires_at;
    }

    if (moment().isAfter(moment(expires_at)))
      access_token = (await loginIOL()).access_token;

    const resp = await axios.get(
      `https://api.invertironline.com/api/v2/${mercado}/Titulos/${symbol}/Cotizacion/seriehistorica/${date}/${date}/sinAjustar`,
      {
        headers: {
          Authorization: `bearer ${access_token}`,
        },
      }
    );

    return { price: resp?.data?.ultimoPrecio || 0 };
  } catch (error) {
    throw new Error(error);
  }
};
