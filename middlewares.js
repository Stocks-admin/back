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

// export async function isAdmin(req, res, next) {
//   const { authorization } = req.headers;

//   if (!authorization) {
//     res.status(401).send({
//       message: "Unauthorized.",
//     });
//   }
//   try {
//     const token = authorization.split(" ")[1];
//     const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
//     req.payload = payload;
//     if (!payload.userId) {
//       return res.status(401).send({
//         message: "Unauthorized.",
//       });
//     }
//     const { roles } = await db.usuario.findUnique({
//       where: {
//         idUsuario: payload.userId,
//       },
//       include: {
//         roles: {
//           select: {
//             rol: true,
//           },
//         },
//       },
//     });
//     if (
//       !roles.some(({ rol }) => {
//         return rol == 3;
//       })
//     ) {
//       return res.status(402).send({
//         message: "Unauthorized.",
//       });
//     }
//   } catch (err) {
//     return res.status(401).send({
//       message: "Unauthorized.",
//     });
//   }
//   return next();
// }

// export async function isInDebt(req, res, next) {
//   const { authorization } = req.headers;
//   const { courseId } = req.params;
//   if (!authorization) {
//     res.status(401).send({
//       message: "Unauthorized.",
//     });
//   }
//   try {
//     const token = authorization.split(" ")[1];
//     const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
//     req.payload = payload;
//     if (!payload.userId) {
//       return res.status(401).send({
//         message: "Unauthorized.",
//       });
//     }
//     console.log("isInDebt: ", await isUsuarioInDebt(courseId, payload.userId));

//     if (await isUsuarioInDebt(courseId, payload.userId)) {
//       return res.status(503).send({
//         message: "User is in debt.",
//       });
//     }
//     return next();
//   } catch (err) {
//     return res.status(401).send({
//       message: "Unauthorized.",
//     });
//   }
// }

// export async function isEnrolled(req, res, next) {
//   const { authorization } = req.headers;
//   const { courseId } = req.params;
//   if (!authorization) {
//     res.status(401).send({
//       message: "Unauthorized.",
//     });
//   }
//   try {
//     const token = authorization.split(" ")[1];
//     const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
//     req.payload = payload;
//     if (!payload.userId) {
//       return res.status(401).send({
//         message: "Unauthorized.",
//       });
//     }
//     if (!(await isUserEnrolled(courseId, payload.userId))) {
//       console.log("Not enrolled");
//       return res.status(505).send({
//         message: "User is not enrolled",
//       });
//     }
//     return next();
//   } catch (err) {
//     return res.status(401).send({
//       message: "Unauthorized.",
//     });
//   }
// }
