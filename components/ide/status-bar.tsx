"use client";

import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Activity, User, Zap } from "lucide-react";
import clsx from "clsx";

interface Props {
  username: string;
  merged: number;
  loc: number;
  externalRepos: number;
  cacheState: "fresh" | "stale" | "miss";
  fetchedAt: string;
  rateRemaining: number | null;
}

export function StatusBar({
  username,
  merged,
  loc,
  externalRepos,
  cacheState,
  fetchedAt,
  rateRemaining,
}: Props) {
  const cacheLabel =
    cacheState === "fresh"
      ? "Cached"
      : cacheState === "stale"
        ? "Stale"
        : "Live";

  const cacheDot =
    cacheState === "fresh"
      ? "bg-emerald-300"
      : cacheState === "stale"
        ? "bg-amber-300"
        : "bg-blue-300";

  const apiCls =
    rateRemaining === null
      ? "text-white/80"
      : rateRemaining < 100
        ? "text-rose-200"
        : rateRemaining < 500
          ? "text-amber-200"
          : "text-emerald-200";

  return (
    <div className="flex h-7 items-center gap-4 bg-blue-600 px-3 text-[11px] text-white dark:bg-blue-700">
      <span className="flex items-center gap-1">
        <Activity size={12} strokeWidth={2} />
        <strong className="font-semibold">{merged.toLocaleString()}</strong>{" "}
        merged
      </span>
      <span>
        +<strong className="font-semibold">{loc.toLocaleString()}</strong> lines
      </span>
      <span>
        <strong className="font-semibold">{externalRepos}</strong> ext repos
      </span>

      <span className="ml-auto flex items-center gap-1.5">
        <span className={clsx("h-1.5 w-1.5 rounded-full", cacheDot)} />
        {cacheLabel} · fetched {formatDistanceToNowStrict(parseISO(fetchedAt))} ago
      </span>

      {rateRemaining !== null ? (
        <span className={clsx("flex items-center gap-1", apiCls)}>
          <Zap size={11} strokeWidth={2} />
          API: {rateRemaining.toLocaleString()} remaining
        </span>
      ) : null}

      <span className="flex items-center gap-1">
        <User size={11} strokeWidth={2} />
        {username}
      </span>
    </div>
  );
}
