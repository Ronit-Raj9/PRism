import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

/**
 * Full profile bundle (GraphQL response, normalized) keyed by lowercased username.
 * `expires_at` controls the fresh window (1h). After that we still serve cached
 * data while revalidating in the background, up to a hard staleness cap (24h)
 * enforced in lib/cache.ts.
 */
export const profileCache = sqliteTable("profile_cache", {
  username: text("username").primaryKey(),
  data: text("data", { mode: "json" }).notNull().$type<unknown>(),
  fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Per-PR file diffs (REST /pulls/:n/files).
 * Keyed on (repo, pr_number). Effectively permanent — diffs of merged/closed PRs
 * never change, and even open PRs invalidate cleanly via fetchedAt.
 */
/**
 * Personal "watchlist" of GitHub usernames the visitor has bookmarked, with
 * private notes and a last-visited timestamp used to compute "what's new since
 * last visit" diffs. Single-user model — this is a personal tool.
 */
export const savedUsers = sqliteTable("saved_users", {
  username: text("username").primaryKey(),
  label: text("label"),
  note: text("note"),
  firstSavedAt: integer("first_saved_at", { mode: "timestamp_ms" }).notNull(),
  lastVisitedAt: integer("last_visited_at", { mode: "timestamp_ms" }),
});

export const prDiffCache = sqliteTable(
  "pr_diff_cache",
  {
    repo: text("repo").notNull(),
    prNumber: integer("pr_number").notNull(),
    files: text("files", { mode: "json" }).notNull().$type<unknown>(),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.repo, t.prNumber] })],
);
