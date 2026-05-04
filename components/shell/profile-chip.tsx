"use client";

import Image from "next/image";
import type { UserProfile } from "@/types/github";

export function ProfileChip({ user }: { user: UserProfile }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-3">
      <Image
        src={user.avatarUrl}
        alt={user.login}
        width={32}
        height={32}
        unoptimized
        className="h-8 w-8 shrink-0 rounded-full"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {user.name ?? user.login}
        </div>
        <div className="truncate text-[11px] text-neutral-500">
          {user.followers.toLocaleString()} followers ·{" "}
          {user.publicRepos.toLocaleString()} repos
        </div>
      </div>
    </div>
  );
}
