"use client";

import { useState, useTransition } from "react";
import { saveUserAction, unsaveUserAction } from "@/app/actions/saved";

export function SaveButton({
  username,
  initialSaved,
}: {
  username: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next); // optimistic
    startTransition(async () => {
      try {
        if (next) await saveUserAction(username);
        else await unsaveUserAction(username);
      } catch {
        setSaved(!next);
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={
        saved
          ? "rounded-md border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/40"
          : "rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }
      title={saved ? "Remove from saved profiles" : "Save to your profiles"}
    >
      {saved ? "★ Saved" : "☆ Save"}
    </button>
  );
}
