import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

process.env.AUTH_TEST_DATA_DIR ??= resolve(
  ".data/test-runs",
  `auth-data-${randomUUID()}`,
);
export default defineConfig({
  testDir: "./tests/auth-browser",
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
    viewport: { width: 1440, height: 960 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "test-results/auth-browser",
  webServer: {
    command: "node tests/start-auth-server.mjs",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_DIST_DIR: ".next-auth",
      DATA_DIR: process.env.AUTH_TEST_DATA_DIR,
      ADMIN_EMAILS: "admin@carnet.test",
      BETTER_AUTH_URL: "http://localhost:3001",
      BETTER_AUTH_SECRET: "test-only-secret-48-characters-never-for-production",
      MAIL_MODE: "local",
    },
  },
});
