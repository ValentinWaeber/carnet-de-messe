import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import nodemailer from "nodemailer";
import { dataDirectory } from "./database";

export async function sendAccountMail(to: string, url: string, reset = false) {
  const subject = reset
    ? "Réinitialisez votre mot de passe"
    : "Confirmez votre adresse e-mail";
  const text = `${subject}\n\nBonjour,\n\n${reset ? "Choisissez un nouveau mot de passe" : "Confirmez votre adresse pour accéder à votre compte Maison du carnet"} :\n${url}\n\nCe lien expire dans une heure. Si vous n’avez pas demandé cet e-mail, ignorez-le.\n\nMaison du carnet`;
  if (
    process.env.MAIL_MODE === "local" &&
    process.env.NODE_ENV === "development"
  ) {
    const directory = join(dataDirectory(), "mail");
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, `${Date.now()}-${randomUUID()}.json`),
      JSON.stringify({
        to,
        subject,
        text,
        url,
        createdAt: new Date().toISOString(),
      }),
      { mode: 0o600 },
    );
    return;
  }
  if (
    process.env.MAIL_MODE !== "smtp" ||
    !process.env.SMTP_HOST ||
    !process.env.SMTP_FROM
  ) {
    throw new Error("L’envoi des e-mails doit être configuré sur le serveur.");
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: process.env.SMTP_SECURE !== "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
  });
}
