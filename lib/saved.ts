import "server-only";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { savedUsers } from "./db/schema";

export interface SavedUser {
  username: string;
  label: string | null;
  note: string | null;
  firstSavedAt: Date;
  lastVisitedAt: Date | null;
}

function key(username: string) {
  return username.toLowerCase();
}

export async function getSaved(username: string): Promise<SavedUser | null> {
  const rows = await db
    .select()
    .from(savedUsers)
    .where(eq(savedUsers.username, key(username)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listSaved(): Promise<SavedUser[]> {
  return db
    .select()
    .from(savedUsers)
    .orderBy(desc(savedUsers.lastVisitedAt), desc(savedUsers.firstSavedAt));
}

export async function saveUser(username: string, label?: string): Promise<void> {
  const k = key(username);
  const now = new Date();
  await db
    .insert(savedUsers)
    .values({
      username: k,
      label: label ?? null,
      note: null,
      firstSavedAt: now,
      lastVisitedAt: null,
    })
    .onConflictDoNothing();
}

export async function unsaveUser(username: string): Promise<void> {
  await db.delete(savedUsers).where(eq(savedUsers.username, key(username)));
}

export async function updateNote(username: string, note: string): Promise<void> {
  const trimmed = note.trim();
  await db
    .update(savedUsers)
    .set({ note: trimmed.length === 0 ? null : trimmed })
    .where(eq(savedUsers.username, key(username)));
}

export async function updateLabel(username: string, label: string): Promise<void> {
  const trimmed = label.trim();
  await db
    .update(savedUsers)
    .set({ label: trimmed.length === 0 ? null : trimmed })
    .where(eq(savedUsers.username, key(username)));
}

/** Mark this saved user as visited "now". No-op if not saved. */
export async function touchVisited(username: string): Promise<void> {
  await db
    .update(savedUsers)
    .set({ lastVisitedAt: new Date() })
    .where(eq(savedUsers.username, key(username)));
}
