import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const FRONTEND_URL = "https://butterstocks.site";

const db = new PrismaClient();

export const mailTransporter = nodemailer.createTransport({
  pool: true,
  host: process.env.EMAIL_AUTH_SERVER,
  port: 465,
  secure: true, // use TLS
  auth: {
    user: process.env.EMAIL_AUTH_USER,
    pass: process.env.EMAIL_AUTH_PSW,
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false,
  },
});

const sendEmailMessage = (message, tipo_email) => {
  return new Promise((resolve, reject) => {
    mailTransporter.sendMail(message, async (err, info) => {
      if (err) {
        await db.email_logs.create({
          data: {
            log_message: err,
            log_date: new Date(),
            log_code: err.code,
          },
        });
        console.log(err);
        reject(err);
      } else {
        await db.email_logs.create({
          data: {
            log_message: info.response,
            log_date: new Date(),
            log_code: 200,
          },
        });
        console.log(info);
        resolve(info);
      }
    });
  });
};

export async function sendVerificationEmail(emailTo, verificationToken) {
  const message = {
    from: process.env.EMAIL_FROM,
    to: emailTo,
    subject: "Verificación de cuenta",
    html: `
          <table cellpadding="0" cellspacing="0" width="100%" bgcolor="#f5f5f5">
          <tr>
              <td align="center" style="padding: 40px 0;">
                  <table cellpadding="0" cellspacing="0" width="600" style="background-color: #fff; border-radius: 10px; box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.1);">
                      <tr>
                          <td style="padding: 40px;">
                              <h2 style="color: #333;">¡Bienvenido a Butter Stocks!</h2>
                              <p style="color: #666;">Por favor, haz clic en el siguiente enlace para verificar tu cuenta:</p>
                              <p style="text-align: center;">
                                  <a href="${FRONTEND_URL}/verify-account?tkn=${verificationToken}" style="display: inline-block; background-color: #007bff; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Verificar Cuenta</a>
                              </p>
                              <p style="color: #666;">Si no has solicitado esta verificación, puedes ignorar este correo.</p>
                              <p style="color: #999; font-size: 12px;">Este mensaje ha sido enviado automáticamente. Por favor, no respondas a este correo.</p>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
      </table>`,
  };

  return await sendEmailMessage(message, 3);
}

export async function sendPasswordRecoveryEmail(emailTo, recoveryToken) {
  const message = {
    from: process.env.EMAIL_FROM,
    to: emailTo,
    subject: "Recuperación de contraseña",
    html: `
          <table cellpadding="0" cellspacing="0" width="100%" bgcolor="#f5f5f5">
          <tr>
              <td align="center" style="padding: 40px 0;">
                  <table cellpadding="0" cellspacing="0" width="600" style="background-color: #fff; border-radius: 10px; box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.1);">
                      <tr>
                          <td style="padding: 40px;">
                              <h2 style="color: #333;">Recuperación de Contraseña</h2>
                              <p style="color: #666;">Hemos recibido una solicitud para restablecer tu contraseña en Butter stocks. Si no hiciste esta solicitud, puedes ignorar este correo.</p>
                              <p style="color: #666;">Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>
                              <p style="text-align: center;">
                                  <a href="${FRONTEND_URL}/recover-password?tkn=${recoveryToken}" style="display: inline-block; background-color: #007bff; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Restablecer Contraseña</a>
                              </p>
                              <p style="color: #666;">Si el botón de arriba no funciona, también puedes copiar y pegar la siguiente URL en tu navegador:</p>
                              <p style="color: #666; text-align: center;"><a href="${FRONTEND_URL}/recover-password?tkn=${recoveryToken}">${FRONTEND_URL}/recover-password?tkn=${recoveryToken}</a></p>
                              <p style="color: #999; font-size: 12px;">Este mensaje ha sido enviado automáticamente. Por favor, no respondas a este correo.</p>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
      </table>`,
  };

  return await sendEmailMessage(message, 3);
}
