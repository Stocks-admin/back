import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcrypt";
import { createHash } from "crypto";

const db = new PrismaClient();

export async function getUserById(id) {
  try {
    const user = await db.user.findUnique({
      where: {
        user_id: id,
      },
    });
    return user;
  } catch (error) {
    throw new Error(error);
  }
}

export async function getUserByEmail(email) {
  try {
    const user = await db.user.findFirst({
      where: {
        email,
      },
    });
    return user;
  } catch (error) {
    throw new Error(error);
  }
}

export async function createUser(email, password) {
  try {
    const user = await db.user.create({
      data: {
        email,
        password: hashSync(password, 10),
      },
    });
    return user;
  } catch (error) {
    throw new Error(error);
  }
}

export function hashToken(token) {
  return createHash("sha512").update(token).digest("hex");
}