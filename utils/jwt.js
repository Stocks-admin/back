import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { hashToken } from "../controllers/authController.js";
const db = new PrismaClient();

export function generateAccessToken(user, expiration = "1d") {
  return jwt.sign({ userId: user.user_id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: expiration,
  });
}

export function generateRefreshToken(user, jti) {
  return jwt.sign(
    {
      user_id: user.user_id,
      jti,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "30d",
    }
  );
}

export function generateTokens(user, jti) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user, jti);

  return {
    accessToken,
    refreshToken,
  };
}

export function impersonateTokens(user, jti) {
  const accessToken = generateAccessToken(user, "1h");

  return {
    accessToken,
  };
}

// used when we create a refresh token.
export function addRefreshTokenToWhitelist({ jti, refreshToken, user_id }) {
  return db.refresh_token.create({
    data: {
      id: jti,
      hashedToken: hashToken(refreshToken),
      user_id: user_id,
    },
  });
}

// used to check if the token sent by the client is in the database.
export function findRefreshTokenById(id) {
  return db.refresh_token.findUnique({
    where: {
      id,
    },
  });
}

// soft delete tokens after usage.
export function deleteRefreshToken(id) {
  return db.refresh_token.update({
    where: {
      id,
    },
    data: {
      revoked: true,
    },
  });
}

export function revokeTokens(user_id) {
  return db.refresh_token.updateMany({
    where: {
      user_id,
    },
    data: {
      revoked: true,
    },
  });
}
