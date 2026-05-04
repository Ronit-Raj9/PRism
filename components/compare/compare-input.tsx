"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import { X, Plus } from "lucide-react";

interface Props {
  usernames: string[];
  max: number;
}

export function CompareInput({ usernames, max }: Props) {
  const router = useRouter();
  const [chips, setChips] = useState<string[]>(usernames);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setChips(usernames);
  }, [usernames]);

  function add() {
    const v = draft.trim();
    if (!v) return;
    if (chips.includes(v)) {
      setDraft("");
      return;
    }
    if (chips.length >= max) return;
    const next = [...chips, v];
    setChips(next);
    setDraft("");
    submit(next);
  }

  function remove(u: string) {
    const next = chips.filter((c) => c !== u);
    setChips(next);
    submit(next);
  }

  function submit(list: string[] = chips) {
    const params = new URLSearchParams();
    for (const u of list) params.append("u", u);
    router.push(`/compare?${params.toString()}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    add();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
    >
      {chips.map((u) => (
        <span
          key={u}
          className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
        >
          {u}
          <button
            type="button"
            onClick={() => remove(u)}
            className="rounded-full p-0.5 transition hover:bg-violet-200 dark:hover:bg-violet-900/60"
            title={`Remove ${u}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      {chips.length < max ? (
        <>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={chips.length === 0 ? "Add GitHub username…" : "Add another…"}
            className="flex-1 min-w-[140px] rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none transition focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            <Plus size={11} /> Add
          </button>
        </>
      ) : (
        <span className="text-[11px] italic text-neutral-500">
          Max {max} users. Remove one to add another.
        </span>
      )}
    </form>
  );
}
