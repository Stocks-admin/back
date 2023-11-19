import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const db = new PrismaClient();
export function isAuthenticated(req, res, next) {
  const { authorization } = req.headers;
  if (!authorization) {
    res.status(401).send({
      message: "Unauthorized.",
    });
  }
  try {
    const token = authorization.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.payload = payload;
    return next();
  } catch (err) {
    return res.status(401).send({
      message: "Unauthorized.",
    });
  }
}
