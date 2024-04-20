import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcrypt";
import { createHash, randomBytes } from "crypto";

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
      include: {
        user_roles: true,
      },
    });
    return user;
  } catch (error) {
    throw new Error(error);
  }
}

export async function createUser(email, password, name, phone) {
  try {
    const user = await db.user.create({
      data: {
        email,
        password: hashSync(password, 10),
        name,
        phone,
        user_roles: {
          create: {
            role: "USER",
          },
        },
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

export async function generateRecoveryToken(user_id) {
  return new Promise((resolve, reject) => {
    randomBytes(20, async (err, buf) => {
      if (err) {
        reject(err);
      } else {
        const token = buf.toString("hex");
        await db.password_reset.create({
          data: {
            User: {
              connect: {
                user_id,
              },
            },
            code: token,
            expiration_date: new Date(Date.now() + 3600000),
          },
        });
        resolve(token);
      }
    });
  });
}

export async function isRecoveryTokenValid(token, user_id) {
  try {
    const recovery = await db.password_reset.findFirst({
      where: {
        code: token,
      },
    });
    if (!recovery) {
      return false;
    }
    if (
      recovery.expiration_date < new Date() ||
      recovery.user_id !== user_id ||
      recovery.expirated
    ) {
      return false;
    }
    await db.password_reset.update({
      where: {
        code: token,
      },
      data: {
        expirated: true,
      },
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function updatePassword(user_id, password) {
  return await db.user.update({
    where: {
      user_id,
    },
    data: {
      password: hashSync(password, 10),
    },
  });
}

export async function getUserByResetToken(token) {
  const recovery = await db.password_reset.findFirst({
    where: {
      code: token,
    },
    include: {
      User: true,
    },
  });
  if (!recovery) {
    return null;
  }
  return recovery.User;
}
