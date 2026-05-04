"use client";

import { Search } from "lucide-react";

export type RepoSort = "activity" | "stars" | "alpha" | "loc";

interface Props {
  filter: string;
  setFilter: (s: string) => void;
  sort: RepoSort;
  setSort: (s: RepoSort) => void;
}

const SORT_LABEL: Record<RepoSort, string> = {
  activity: "Most active",
  stars: "Most stars",
  alpha: "Name A–Z",
  loc: "Most changed lines",
};

export function SidebarControls({ filter, setFilter, sort, setSort }: Props) {
  return (
    <div className="space-y-2 border-t border-[var(--border)] px-4 py-3">
      <div className="relative">
        <Search
          size={14}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search repositories"
          className="ui-input w-full py-2.5 pl-9 pr-3 text-xs"
        />
      </div>
      <label className="sr-only" htmlFor="repo-sort">
        Sort repositories
      </label>
      <select
        id="repo-sort"
        value={sort}
        onChange={(e) => setSort(e.target.value as RepoSort)}
        className="ui-select text-xs"
      >
        {(Object.keys(SORT_LABEL) as RepoSort[]).map((id) => (
          <option key={id} value={id}>
            {SORT_LABEL[id]}
          </option>
        ))}
      </select>
    </div>
  );
}
