import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "file:./gitgambit.db";
const filePath = url.replace(/^file:/, "");
const dbPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
console.log("Migrations applied to", dbPath);
sqlite.close();
