"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { saveUserAction, unsaveUserAction } from "@/app/actions/saved";

export function SaveButton({
  username,
  initialSaved,
  compact,
}: {
  username: string;
  initialSaved: boolean;
  compact?: boolean;
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

  const title = saved ? "Remove from saved" : "Save profile";

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={pending}
        title={title}
        className={
          saved
            ? "flex h-9 w-9 items-center justify-center rounded-lg text-amber-500 transition hover:bg-amber-500/10 disabled:opacity-50"
            : "flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:opacity-50"
        }
      >
        <Star size={17} strokeWidth={1.75} className={saved ? "fill-current" : ""} />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={title}
      className={
        saved
          ? "rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-500/15 disabled:opacity-50 dark:text-amber-300"
          : "rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)] disabled:opacity-50"
      }
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}
