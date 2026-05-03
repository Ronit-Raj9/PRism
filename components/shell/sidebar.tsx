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

interface Props {
  user: UserProfile;
  username: string;
  externalGroups: RepoTreeGroup[];
  ownGroups: RepoTreeGroup[];
  savedList: SavedItem[];
}

const COLLAPSED_KEY = "gitscope-sidebar-collapsed-sections";

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

  const filteredExternal = useMemo(
    () => sortGroups(filterGroups(externalGroups, filter), sort),
    [externalGroups, filter, sort],
  );
  const filteredOwn = useMemo(
    () => sortGroups(filterGroups(ownGroups, filter), sort),
    [ownGroups, filter, sort],
  );

  function toggleSection(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    writeCollapsed(next);
  }

  return (
    <div className="flex min-h-full flex-col text-sm">
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
          storageKey="gitscope-tree-ext"
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
            storageKey="gitscope-tree-own"
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
    <div className="border-t border-neutral-200 dark:border-neutral-800">
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={`section-${id}`}
        className="flex w-full items-center gap-1 px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 transition hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        {collapsed ? (
          <ChevronRight size={10} className="text-neutral-400" />
        ) : (
          <ChevronDown size={10} className="text-neutral-400" />
        )}
        <span>{title}</span>
        <span
          className={clsx(
            "ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-medium",
            filtered
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
              : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
          )}
        >
          {filtered ? `${count}/${totalCount}` : totalCount}
        </span>
      </button>
      {!collapsed ? (
        <div id={`section-${id}`} className="pb-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}
