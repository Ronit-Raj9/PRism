"use server";

import { revalidatePath } from "next/cache";
import {
  saveUser,
  unsaveUser,
  updateNote as updateNoteDb,
  updateLabel as updateLabelDb,
} from "@/lib/saved";

export async function saveUserAction(username: string) {
  await saveUser(username);
  revalidatePath(`/u/${username}`);
  revalidatePath("/", "layout");
}

export async function unsaveUserAction(username: string) {
  await unsaveUser(username);
  revalidatePath(`/u/${username}`);
  revalidatePath("/", "layout");
}

export async function updateNoteAction(username: string, note: string) {
  await updateNoteDb(username, note);
  revalidatePath(`/u/${username}`);
}

export async function updateLabelAction(username: string, label: string) {
  await updateLabelDb(username, label);
  revalidatePath(`/u/${username}`);
  revalidatePath("/", "layout");
}
