import "server-only";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { database, dataDirectory } from "./database";
import { sendAccountMail } from "./mail";

function authSecret() {
  if (
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_SECRET.length >= 32
  )
    return process.env.BETTER_AUTH_SECRET;
  if (process.env.NODE_ENV === "production")
    throw new Error("BETTER_AUTH_SECRET doit contenir au moins 32 caractères.");
  const path = join(dataDirectory(), "auth-secret");
  if (!existsSync(path)) {
    try {
      writeFileSync(path, randomBytes(48).toString("hex"), {
        mode: 0o600,
        flag: "wx",
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  return readFileSync(path, "utf8");
}
function authOptions() {
  const db = database();
  const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_URL)
    throw new Error("BETTER_AUTH_URL doit être configurée.");
  if (
    process.env.NODE_ENV === "production" &&
    (process.env.MAIL_MODE !== "smtp" ||
      !process.env.SMTP_HOST ||
      !process.env.SMTP_FROM)
  )
    throw new Error(
      "Configurez SMTP avant d’ouvrir les inscriptions en production.",
    );
  if (
    process.env.NODE_ENV === "production" &&
    new URL(baseURL).protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)
  )
    throw new Error("L’authentification en production nécessite HTTPS.");
  return {
    appName: "Maison du carnet",
    baseURL,
    secret: authSecret(),
    database: db,
    trustedOrigins: [new URL(baseURL).origin],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 3600,
      sendResetPassword: async ({ user, url }) =>
        sendAccountMail(user.email, url, true),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }) =>
        sendAccountMail(user.email, url),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
      },
    },
    advanced: { useSecureCookies: new URL(baseURL).protocol === "https:" },
  } satisfies BetterAuthOptions;
}
function createAuth(options: ReturnType<typeof authOptions>) {
  return betterAuth(options);
}
const state = globalThis as typeof globalThis & {
  carnetAuth?: Promise<ReturnType<typeof createAuth>>;
};
export async function getAuth() {
  state.carnetAuth ??= (async () => {
    const options = authOptions();
    await (await getMigrations(options)).runMigrations();
    return createAuth(options);
  })().catch((error) => {
    state.carnetAuth = undefined;
    throw error;
  });
  return state.carnetAuth;
}
export function isAdministrator(user: {
  email: string;
  emailVerified: boolean;
}) {
  const emails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return user.emailVerified && emails.includes(user.email.toLowerCase());
}
export async function account(headers: Headers) {
  const session = await (await getAuth()).api.getSession({ headers });
  if (!session || !session.user.emailVerified) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    admin: isAdministrator(session.user),
  };
}
