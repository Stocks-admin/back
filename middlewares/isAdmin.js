// isAdmin.js

import { verify } from "jsonwebtoken";
import { userIsAdmin } from "../controllers/userController";

export function isAdmin(req, res, next) {
  try {
    const { authorization } = req.headers;
    const access_token = authorization.split(" ")[1];
    if (!access_token) {
      return res.status(401).send(errorMessages.unauthorized);
    }
    const payload = verify(access_token, process.env.JWT_ACCESS_SECRET);
    if (!payload?.userId) {
      return res.status(401).send(errorMessages.unauthorized);
    }
    const isAdmin = userIsAdmin(parseInt(payload.userId));
    if (!isAdmin) {
      return res.status(403).json(errorMessages.unauthorized);
    }
    next();
  } catch (error) {
    res.status(403).json(errorMessages.unauthorized);
  }
}

export function isUser(req, res, next) {
  try {
    const { authorization } = req.headers;
    const access_token = authorization.split(" ")[1];
    if (!access_token) {
      return res.status(401).send(errorMessages.unauthorized);
    }
    const payload = verify(access_token, process.env.JWT_ACCESS_SECRET);
    if (!payload?.userId) {
      return res.status(401).send(errorMessages.unauthorized);
    }
    next();
  } catch (error) {
    res.status(403).json(errorMessages.unauthorized);
  }
}
