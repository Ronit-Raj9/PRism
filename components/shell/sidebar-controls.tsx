"use client";

import { Search, ArrowDownAZ, Star, Activity, Code2 } from "lucide-react";
import clsx from "clsx";

export type RepoSort = "activity" | "stars" | "alpha" | "loc";

interface Props {
  filter: string;
  setFilter: (s: string) => void;
  sort: RepoSort;
  setSort: (s: RepoSort) => void;
}

const SORTS: { id: RepoSort; label: string; Icon: typeof Star }[] = [
  { id: "activity", label: "Activity", Icon: Activity },
  { id: "stars", label: "Stars", Icon: Star },
  { id: "alpha", label: "Name", Icon: ArrowDownAZ },
  { id: "loc", label: "LOC", Icon: Code2 },
];

export function SidebarControls({ filter, setFilter, sort, setSort }: Props) {
  return (
    <div className="space-y-1.5 border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
      <div className="relative">
        <Search
          size={11}
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500"
        />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter repos…"
          className="w-full rounded border border-neutral-300 bg-white py-1 pl-6 pr-2 text-[11px] outline-none transition focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <div className="flex gap-0.5 rounded border border-neutral-200 bg-neutral-50 p-0.5 text-[10px] dark:border-neutral-800 dark:bg-neutral-900">
        {SORTS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSort(id)}
            title={`Sort by ${label.toLowerCase()}`}
            className={clsx(
              "flex flex-1 items-center justify-center gap-0.5 rounded px-1 py-0.5 transition",
              sort === id
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800",
            )}
          >
            <Icon size={9} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
