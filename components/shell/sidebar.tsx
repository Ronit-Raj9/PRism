"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { UserProfile } from "@/types/github";
import type { SavedItem } from "@/components/saved-switcher";
import { ProfileChip } from "./profile-chip";
import { SidebarNav } from "./sidebar-nav";
import { RepoTree, type RepoTreeGroup } from "./repo-tree";
import { SavedProfiles } from "./saved-profiles";
import { SidebarControls, type RepoSort } from "./sidebar-controls";
import { useStoredSet } from "./use-stored-set";
import { useDebouncedValue } from "./use-debounced-value";

interface Props {
  user: UserProfile;
  username: string;
  externalGroups: RepoTreeGroup[];
  ownGroups: RepoTreeGroup[];
  savedList: SavedItem[];
}

const COLLAPSED_KEY = "gitgambit-sidebar-collapsed-sections";

export function Sidebar({
  user,
  username,
  externalGroups,
  ownGroups,
  savedList,
}: Props) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<RepoSort>("activity");
  const [collapsed, writeCollapsed] = useStoredSet(COLLAPSED_KEY);

  // Debounce the filter so each keystroke doesn't re-run the filter+sort
  // pass over potentially hundreds of repos.
  const debouncedFilter = useDebouncedValue(filter, 150);

  const filteredExternal = useMemo(
    () => sortGroups(filterGroups(externalGroups, debouncedFilter), sort),
    [externalGroups, debouncedFilter, sort],
  );
  const filteredOwn = useMemo(
    () => sortGroups(filterGroups(ownGroups, debouncedFilter), sort),
    [ownGroups, debouncedFilter, sort],
  );

  function toggleSection(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    writeCollapsed(next);
  }

  return (
    <div className="flex min-h-full flex-col text-[13px] leading-snug">
      <ProfileChip user={user} />
      <SidebarNav username={username} />
      <SidebarControls
        filter={filter}
        setFilter={setFilter}
        sort={sort}
        setSort={setSort}
      />

      <SidebarSection
        id="external"
        title="External"
        count={filteredExternal.length}
        totalCount={externalGroups.length}
        collapsed={collapsed.has("external")}
        onToggle={() => toggleSection("external")}
      >
        <RepoTree
          username={username}
          groups={filteredExternal}
          storageKey="gitgambit-tree-ext"
        />
      </SidebarSection>

      {ownGroups.length > 0 ? (
        <SidebarSection
          id="own"
          title="Own"
          count={filteredOwn.length}
          totalCount={ownGroups.length}
          collapsed={collapsed.has("own")}
          onToggle={() => toggleSection("own")}
        >
          <RepoTree
            username={username}
            groups={filteredOwn}
            storageKey="gitgambit-tree-own"
          />
        </SidebarSection>
      ) : null}

      <SavedProfiles
        items={savedList}
        username={username}
        collapsed={collapsed.has("saved")}
        onToggle={() => toggleSection("saved")}
      />
    </div>
  );
}

function filterGroups(
  groups: RepoTreeGroup[],
  filter: string,
): RepoTreeGroup[] {
  const q = filter.trim().toLowerCase();
  if (!q) return groups;
  return groups.filter((g) => g.repo.toLowerCase().includes(q));
}

function sortGroups(groups: RepoTreeGroup[], sort: RepoSort): RepoTreeGroup[] {
  const arr = [...groups];
  switch (sort) {
    case "stars":
      return arr.sort((a, b) => b.stars - a.stars);
    case "alpha":
      return arr.sort((a, b) => a.repo.localeCompare(b.repo));
    case "loc":
      return arr.sort(
        (a, b) =>
          b.totalAdditions + b.totalDeletions - (a.totalAdditions + a.totalDeletions),
      );
    case "activity":
    default:
      // Existing groupByRepo() default ordering is already merged-PRs > stars > volume.
      return arr;
  }
}

function SidebarSection({
  id,
  title,
  count,
  totalCount,
  collapsed,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  count: number;
  totalCount: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const filtered = count !== totalCount;
  return (
    <div className="border-t border-[var(--border)]">
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={`section-${id}`}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        {collapsed ? (
          <ChevronRight size={14} strokeWidth={1.75} className="shrink-0 opacity-60" />
        ) : (
          <ChevronDown size={14} strokeWidth={1.75} className="shrink-0 opacity-60" />
        )}
        <span className="text-[var(--foreground)]">{title}</span>
        <span
          className={clsx(
            "ml-auto rounded-md px-2 py-0.5 text-[10px] font-medium tabular-nums",
            filtered
              ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
              : "bg-[var(--surface-2)] text-[var(--muted)]",
          )}
        >
          {filtered ? `${count}/${totalCount}` : totalCount}
        </span>
      </button>
      {!collapsed ? (
        <div id={`section-${id}`} className="px-1 pb-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}
