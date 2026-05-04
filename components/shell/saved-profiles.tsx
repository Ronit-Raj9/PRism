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
    <div className="mt-auto border-t border-[var(--border)]">
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        {collapsed ? (
          <ChevronRight size={14} strokeWidth={1.75} className="shrink-0 opacity-60" />
        ) : (
          <ChevronDown size={14} strokeWidth={1.75} className="shrink-0 opacity-60" />
        )}
        <span className="text-[var(--foreground)]">Saved</span>
        <span className="ml-auto rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium tabular-nums text-[var(--muted)]">
          {items.length}
        </span>
      </button>
      {!collapsed ? (
        <ul className="space-y-0.5 px-2 pb-4">
          {items.length === 0 ? (
            <li className="rounded-lg px-3 py-2 text-xs italic text-[var(--muted)]">
              Save this profile from the top bar to pin it here.
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
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                      isCurrent
                        ? "bg-[var(--surface-2)] font-medium text-[var(--foreground)]"
                        : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                    )}
                  >
                    <Star
                      size={14}
                      strokeWidth={1.75}
                      className={clsx(
                        "shrink-0",
                        isCurrent ? "text-amber-500" : "text-[var(--muted)]",
                      )}
                    />
                    <span className="truncate">{s.label ?? s.username}</span>
                  </Link>
                </li>
              );
            })
          )}
          <li>
            <Link
              href="/"
              className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              <Plus size={14} strokeWidth={1.75} />
              Add profile
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
