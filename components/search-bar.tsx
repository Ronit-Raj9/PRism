"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
export function SearchBar({
  initial = "",
  variant = "hero",
}: {
  initial?: string;
  variant?: "hero" | "shell";
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//, "");
    if (!trimmed) return;
    setPending(true);
    router.push(`/u/${encodeURIComponent(trimmed)}`);
  }

  if (variant === "shell") {
    return (
      <form onSubmit={submit} className="flex w-full min-w-0 max-w-xl items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Username or github.com/…"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-indigo-400/50 focus:bg-[var(--surface)] focus:ring-2 focus:ring-indigo-500/15 dark:focus:border-indigo-500/30"
        />
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-zinc-800 disabled:opacity-45 dark:bg-zinc-100 dark:text-zinc-900 dark:enabled:hover:bg-zinc-200"
        >
          {pending ? "…" : "Open"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="GitHub username"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        className="ui-input flex-1 py-3.5 text-base sm:min-w-0"
      />
      <button
        type="submit"
        disabled={pending || !value.trim()}
        className="rounded-xl bg-zinc-900 px-8 py-3.5 text-sm font-medium text-white transition enabled:hover:bg-zinc-800 disabled:opacity-45 dark:bg-zinc-100 dark:text-zinc-900 dark:enabled:hover:bg-zinc-200"
      >
        {pending ? "Loading…" : "Analyze"}
      </button>
    </form>
  );
}
