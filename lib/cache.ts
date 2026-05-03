import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { profileCache, prDiffCache } from "./db/schema";

const FRESH_TTL_MS = 60 * 60 * 1000; // 1 hour
const STALE_MAX_MS = 24 * 60 * 60 * 1000; // 24 hours

export type CacheState = "fresh" | "stale" | "miss";

export interface CachedProfile<T> {
  data: T;
  state: CacheState;
  fetchedAt: Date;
}

export async function getCachedProfile<T>(
  username: string,
): Promise<CachedProfile<T> | null> {
  const key = username.toLowerCase();
  const rows = await db
    .select()
    .from(profileCache)
    .where(eq(profileCache.username, key))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const age = Date.now() - row.fetchedAt.getTime();
  if (age > STALE_MAX_MS) return null;

  const state: CacheState = row.expiresAt.getTime() > Date.now() ? "fresh" : "stale";
  return { data: row.data as T, state, fetchedAt: row.fetchedAt };
}

export async function setCachedProfile<T>(
  username: string,
  data: T,
): Promise<void> {
  const key = username.toLowerCase();
  const now = new Date();
  const expires = new Date(now.getTime() + FRESH_TTL_MS);
  await db
    .insert(profileCache)
    .values({ username: key, data, fetchedAt: now, expiresAt: expires })
    .onConflictDoUpdate({
      target: profileCache.username,
      set: { data, fetchedAt: now, expiresAt: expires },
    });
}

export async function getCachedPRDiff<T>(
  repo: string,
  prNumber: number,
): Promise<T | null> {
  const rows = await db
    .select()
    .from(prDiffCache)
    .where(and(eq(prDiffCache.repo, repo), eq(prDiffCache.prNumber, prNumber)))
    .limit(1);
  return (rows[0]?.files as T) ?? null;
}

export async function setCachedPRDiff<T>(
  repo: string,
  prNumber: number,
  files: T,
): Promise<void> {
  await db
    .insert(prDiffCache)
    .values({ repo, prNumber, files, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: [prDiffCache.repo, prDiffCache.prNumber],
      set: { files, fetchedAt: new Date() },
    });
}
