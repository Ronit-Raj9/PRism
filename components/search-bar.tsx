"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SearchBar({ initial = "" }: { initial?: string }) {
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

  return (
    <form onSubmit={submit} className="flex w-full max-w-xl gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="GitHub username (e.g. torvalds, gaearon, sindresorhus)"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
      />
      <button
        type="submit"
        disabled={pending || !value.trim()}
        className="rounded-md bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition enabled:hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:enabled:hover:bg-neutral-300"
      >
        {pending ? "Loading…" : "Analyze"}
      </button>
    </form>
  );
}
