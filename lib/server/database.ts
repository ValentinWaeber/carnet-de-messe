import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Runtime data must never be traced into a deployment bundle.
export const dataDirectory = () =>
  resolve(/* turbopackIgnore: true */ process.env.DATA_DIR || ".data");
const state = globalThis as typeof globalThis & {
  carnetDatabase?: DatabaseSync;
};
export function database() {
  if (!state.carnetDatabase) {
    mkdirSync(dataDirectory(), { recursive: true });
    const db = new DatabaseSync(resolve(dataDirectory(), "carnet.sqlite"));
    db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
    );
    db.exec(`CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY, metadata TEXT NOT NULL, document TEXT NOT NULL,
      assets TEXT NOT NULL DEFAULT '[]', revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL, updated_by TEXT
    );`);
    state.carnetDatabase = db;
  }
  return state.carnetDatabase;
}
