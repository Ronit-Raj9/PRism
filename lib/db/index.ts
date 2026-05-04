import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import * as schema from "./schema";

declare global {
  var __gitscope_db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  var __gitscope_db_migrated: boolean | undefined;
}

function resolveDbPath(): string {
  // Vercel lambdas mount the project read-only; /tmp is the only writable dir.
  if (process.env.VERCEL) return "/tmp/gitscope.db";
  const url = process.env.DATABASE_URL ?? "file:./gitscope.db";
  const filePath = url.replace(/^file:/, "");
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

// Idempotent schema bootstrap. Drizzle's file-based migrator reads from the
// drizzle/ folder which isn't bundled into Vercel lambdas, so we apply the
// schema inline instead. Column names match drizzle/0000_*.sql + 0001_*.sql.
const BOOTSTRAP_SQL = `
  CREATE TABLE IF NOT EXISTS profile_cache (
    username   TEXT PRIMARY KEY NOT NULL,
    data       TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pr_diff_cache (
    repo       TEXT NOT NULL,
    pr_number  INTEGER NOT NULL,
    files      TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    PRIMARY KEY (repo, pr_number)
  );
  CREATE TABLE IF NOT EXISTS saved_users (
    username        TEXT PRIMARY KEY NOT NULL,
    label           TEXT,
    note            TEXT,
    first_saved_at  INTEGER NOT NULL,
    last_visited_at INTEGER
  );
`;

function createDb() {
  const sqlite = new Database(resolveDbPath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(BOOTSTRAP_SQL);
  const db = drizzle(sqlite, { schema });
  try {
    // In local dev the drizzle/ folder exists and migrations track schema changes.
    // On Vercel this throws (no folder) — bootstrap above guarantees tables exist.
    migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  } catch {
    // Expected on Vercel; harmless locally when already migrated.
  }
  return db;
}

export const db = globalThis.__gitscope_db ?? createDb();
if (process.env.NODE_ENV !== "production") globalThis.__gitscope_db = db;
if (!globalThis.__gitscope_db_migrated) globalThis.__gitscope_db_migrated = true;
