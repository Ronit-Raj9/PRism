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
        className="flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <span>★</span>
        <span>Saved</span>
        {items.length > 0 ? (
          <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {items.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 max-h-[70vh] w-80 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {items.length === 0 ? (
            <div className="p-4 text-center text-sm text-neutral-500">
              No saved profiles yet.
              <br />
              Click ☆ Save on any profile to add it here.
            </div>
          ) : (
            <>
              <div className="border-b border-neutral-200 px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                Your watchlist
              </div>
              <ul>
                {items.map((it) => (
                  <li
                    key={it.username}
                    className="border-t border-neutral-100 first:border-t-0 dark:border-neutral-800"
                  >
                    <Link
                      href={`/u/${it.username}`}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2 transition hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">
                          {it.label ?? it.username}
                        </span>
                        {it.lastVisitedAt ? (
                          <span className="shrink-0 text-[10px] text-neutral-500">
                            {formatDistanceToNowStrict(new Date(it.lastVisitedAt))} ago
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            new
                          </span>
                        )}
                      </div>
                      {it.label && it.label !== it.username ? (
                        <div className="font-mono text-[11px] text-neutral-500">
                          @{it.username}
                        </div>
                      ) : null}
                      {it.note ? (
                        <div className="mt-1 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">
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
