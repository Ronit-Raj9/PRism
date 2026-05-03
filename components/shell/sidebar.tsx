"use client";

import type { UserProfile } from "@/types/github";
import type { SavedItem } from "@/components/saved-switcher";
import { ProfileChip } from "./profile-chip";
import { SidebarNav } from "./sidebar-nav";
import { RepoTree, type RepoTreeGroup } from "./repo-tree";
import { SavedProfiles } from "./saved-profiles";

interface Props {
  user: UserProfile;
  username: string;
  externalGroups: RepoTreeGroup[];
  ownGroups: RepoTreeGroup[];
  savedList: SavedItem[];
}

export function Sidebar({
  user,
  username,
  externalGroups,
  ownGroups,
  savedList,
}: Props) {
  return (
    <div className="flex min-h-full flex-col text-sm">
      <ProfileChip user={user} />
      <SidebarNav username={username} />

      <SidebarSection title="External repositories" count={externalGroups.length}>
        <RepoTree
          username={username}
          groups={externalGroups}
          storageKey="gitscope-tree-ext"
        />
      </SidebarSection>

      {ownGroups.length > 0 ? (
        <SidebarSection title="Own repositories" count={ownGroups.length}>
          <RepoTree
            username={username}
            groups={ownGroups}
            storageKey="gitscope-tree-own"
          />
        </SidebarSection>
      ) : null}

      <SavedProfiles items={savedList} username={username} />
    </div>
  );
}

function SidebarSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-2 px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        <span>{title}</span>
        {count !== undefined ? (
          <span className="text-neutral-400">{count}</span>
        ) : null}
      </div>
      <div className="pb-1">{children}</div>
    </div>
  );
}
