"use client";

import Image from "next/image";
import { format, parseISO, formatDistanceToNowStrict } from "date-fns";
import type { ProfileBundle, PRNode } from "@/types/github";
import type { TimelineEvent } from "@/lib/timeline";
import { OverviewDashboard } from "@/components/overview-dashboard";

interface Props {
  bundle: ProfileBundle;
  username: string;
  events: TimelineEvent[];
  externalPRs: PRNode[];
  ownPRs: PRNode[];
}

export function EditorOverview({
  bundle,
  username,
  events,
  externalPRs,
  ownPRs,
}: Props) {
  const u = bundle.user;
  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <header className="flex flex-col gap-5 border-b border-neutral-200 pb-6 sm:flex-row sm:items-start dark:border-neutral-800">
        <Image
          src={u.avatarUrl}
          alt={u.login}
          width={96}
          height={96}
          className="h-20 w-20 rounded-full sm:h-24 sm:w-24"
          unoptimized
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="text-xl font-semibold sm:text-2xl">
              {u.name ?? u.login}
            </h1>
            <a
              href={`https://github.com/${u.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              @{u.login}
            </a>
          </div>
          {u.bio ? (
            <p className="mt-2 max-w-2xl text-sm text-neutral-700 dark:text-neutral-300">
              {u.bio}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
            {u.company ? <span>🏢 {u.company}</span> : null}
            {u.location ? <span>📍 {u.location}</span> : null}
            {u.blog ? (
              <a
                href={u.blog.startsWith("http") ? u.blog : `https://${u.blog}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                🔗 {u.blog}
              </a>
            ) : null}
            <span>
              Joined {format(parseISO(u.createdAt), "MMM yyyy")} ·{" "}
              {formatDistanceToNowStrict(parseISO(u.createdAt))} ago
            </span>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-neutral-700 dark:text-neutral-300">
            <span>
              <strong>{u.followers.toLocaleString()}</strong> followers
            </span>
            <span>
              <strong>{u.following.toLocaleString()}</strong> following
            </span>
            <span>
              <strong>{u.publicRepos.toLocaleString()}</strong> public repos
            </span>
          </div>
        </div>
      </header>

      <div className="mt-6">
        <OverviewDashboard bundle={bundle} username={username} events={events} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stat
          label="External PRs"
          value={externalPRs.length}
          sub={`${externalPRs.filter((p) => p.state === "MERGED").length} merged`}
        />
        <Stat
          label="Own PRs"
          value={ownPRs.length}
          sub={`${ownPRs.filter((p) => p.state === "MERGED").length} merged`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</div>
      {sub ? (
        <div className="text-xs text-neutral-500">{sub}</div>
      ) : null}
    </div>
  );
}
