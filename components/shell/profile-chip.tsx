"use client";

import Image from "next/image";
import type { UserProfile } from "@/types/github";

export function ProfileChip({ user }: { user: UserProfile }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <Image
        src={user.avatarUrl}
        alt={user.login}
        width={40}
        height={40}
        unoptimized
        className="h-10 w-10 shrink-0 rounded-full ring-1 ring-[var(--border)]"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
          {user.name ?? user.login}
        </div>
        <div className="mt-0.5 truncate text-xs text-[var(--muted)]">
          {user.followers.toLocaleString()} followers · {user.publicRepos.toLocaleString()} repos
        </div>
      </div>
    </div>
  );
}
