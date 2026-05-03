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
  const url = process.env.DATABASE_URL ?? "file:./gitscope.db";
  const filePath = url.replace(/^file:/, "");
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function createDb() {
  const sqlite = new Database(resolveDbPath());
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}

export const db = globalThis.__gitscope_db ?? createDb();
if (process.env.NODE_ENV !== "production") globalThis.__gitscope_db = db;

if (!globalThis.__gitscope_db_migrated) {
  try {
    migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    globalThis.__gitscope_db_migrated = true;
  } catch {
    // No migrations dir yet — schema may be applied via raw SQL on first run.
    // Fall through; first use will surface a clear error if the table is missing.
  }
}
