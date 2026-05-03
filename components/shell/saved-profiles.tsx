"use client";

import Link from "next/link";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Plus, Star } from "lucide-react";
import type { SavedItem } from "@/components/saved-switcher";

interface Props {
  items: SavedItem[];
  username: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function SavedProfiles({
  items,
  username,
  collapsed = false,
  onToggle,
}: Props) {
  return (
    <div className="mt-auto border-t border-neutral-200 dark:border-neutral-800">
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-1 px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 transition hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        {collapsed ? (
          <ChevronRight size={10} className="text-neutral-400" />
        ) : (
          <ChevronDown size={10} className="text-neutral-400" />
        )}
        <span>Saved</span>
        <span className="ml-auto rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
          {items.length}
        </span>
      </button>
      {!collapsed ? (
        <ul className="px-2 pb-3">
          {items.length === 0 ? (
            <li className="px-1 py-1 text-[11px] italic text-neutral-500">
              Click ☆ Save in the top bar to add this profile.
            </li>
          ) : (
            items.map((s) => {
              const isCurrent =
                s.username.toLowerCase() === username.toLowerCase();
              return (
                <li key={s.username}>
                  <Link
                    href={`/u/${s.username}`}
                    className={clsx(
                      "flex items-center gap-1.5 rounded px-1.5 py-1 text-[12px] transition",
                      isCurrent
                        ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800/50",
                    )}
                  >
                    <Star size={10} className="shrink-0 text-amber-500" />
                    <span className="truncate">{s.label ?? s.username}</span>
                  </Link>
                </li>
              );
            })
          )}
          <li>
            <Link
              href="/"
              className="mt-1 flex items-center gap-1.5 rounded px-1.5 py-1 text-[12px] text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-100"
            >
              <Plus size={10} />
              Add profile…
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
