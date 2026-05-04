"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";

export interface SavedItem {
  username: string;
  label: string | null;
  note: string | null;
  lastVisitedAt: Date | null;
}

export function SavedSwitcher({ items }: { items: SavedItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
      >
        <span className="text-amber-500">★</span>
        <span>Saved</span>
        {items.length > 0 ? (
          <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--muted)]">
            {items.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg shadow-black/5 dark:shadow-black/40">
          {items.length === 0 ? (
            <div className="p-5 text-center text-sm text-[var(--muted)]">
              No saved profiles yet.
              <br />
              <span className="mt-2 inline-block text-xs">Use Save on a profile page to add one.</span>
            </div>
          ) : (
            <>
              <div className="border-b border-[var(--border)] px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Watchlist
              </div>
              <ul>
                {items.map((it) => (
                  <li
                    key={it.username}
                    className="border-t border-[var(--border)] first:border-t-0"
                  >
                    <Link
                      href={`/u/${it.username}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2.5 transition hover:bg-[var(--surface-2)]"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">
                          {it.label ?? it.username}
                        </span>
                        {it.lastVisitedAt ? (
                          <span className="shrink-0 text-[10px] text-[var(--muted)]">
                            {formatDistanceToNowStrict(new Date(it.lastVisitedAt))} ago
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            new
                          </span>
                        )}
                      </div>
                      {it.label && it.label !== it.username ? (
                        <div className="font-mono text-[11px] text-[var(--muted)]">
                          @{it.username}
                        </div>
                      ) : null}
                      {it.note ? (
                        <div className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                          {it.note}
                        </div>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
