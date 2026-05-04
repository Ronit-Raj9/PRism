"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, Link2, MapPin } from "lucide-react";
import type { UserProfile } from "@/types/github";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

export function ProfileHeader({ user }: { user: UserProfile }) {
  return (
    <header className="flex flex-col gap-8 border-b border-[var(--border)] pb-10 sm:flex-row sm:items-start">
      <Image
        src={user.avatarUrl}
        alt={user.login}
        width={112}
        height={112}
        className="h-24 w-24 shrink-0 rounded-2xl ring-1 ring-[var(--border)] sm:h-28 sm:w-28"
        unoptimized
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {user.name ?? user.login}
          </h1>
          <a
            href={`https://github.com/${user.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            @{user.login}
          </a>
        </div>
        {user.bio ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--foreground)]/90">
            {user.bio}
          </p>
        ) : null}
        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
          {user.company ? (
            <div className="flex items-center gap-1.5">
              <Building2 size={14} strokeWidth={1.75} className="shrink-0 opacity-70" />
              <span>{user.company}</span>
            </div>
          ) : null}
          {user.location ? (
            <div className="flex items-center gap-1.5">
              <MapPin size={14} strokeWidth={1.75} className="shrink-0 opacity-70" />
              <span>{user.location}</span>
            </div>
          ) : null}
          {user.blog ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <Link2 size={14} strokeWidth={1.75} className="shrink-0 opacity-70" />
              <a
                href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-[var(--foreground)]"
              >
                {user.blog.replace(/^https?:\/\//, "")}
              </a>
            </div>
          ) : null}
          {user.twitterUsername ? (
            <div className="flex items-center gap-1.5">
              <Link
                href={`https://twitter.com/${user.twitterUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--foreground)]"
              >
                @{user.twitterUsername}
              </Link>
            </div>
          ) : null}
          <div className="w-full text-[13px] sm:w-auto">
            Joined {format(parseISO(user.createdAt), "MMM yyyy")} ·{" "}
            {formatDistanceToNowStrict(parseISO(user.createdAt))} ago
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-6 text-sm">
          <Stat value={user.followers} label="followers" />
          <Stat value={user.following} label="following" />
          <Stat value={user.publicRepos} label="public repos" />
        </div>
      </div>
    </header>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="text-[var(--muted)]">
      <strong className="font-semibold tabular-nums text-[var(--foreground)]">
        {value.toLocaleString()}
      </strong>{" "}
      {label}
    </span>
  );
}
