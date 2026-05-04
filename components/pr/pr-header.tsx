"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GitMerge,
  GitPullRequestArrow,
  GitPullRequestClosed,
} from "lucide-react";
import clsx from "clsx";
import type { PRNode } from "@/types/github";
import type { PRNeighbour } from "./pr-view";

interface Props {
  pr: PRNode;
  username: string;
  prev: PRNeighbour | null;
  next: PRNeighbour | null;
}

export function PRHeader({ pr, username, prev, next }: Props) {
  const [owner, repo] = pr.repo.nameWithOwner.split("/");
  return (
    <div className="border-b border-neutral-200 bg-white px-5 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
        <Link
          href={`/u/${username}`}
          className="hover:text-neutral-900 dark:hover:text-neutral-200"
        >
          {username}
        </Link>
        <ChevronRight size={11} />
        <Link
          href={`/u/${username}/org/${owner}`}
          className="font-mono hover:text-neutral-900 dark:hover:text-neutral-200"
        >
          {owner}
        </Link>
        <ChevronRight size={11} />
        <Link
          href={`/u/${username}/repo/${owner}/${repo}`}
          className="font-mono hover:text-neutral-900 dark:hover:text-neutral-200"
        >
          {repo}
        </Link>
        <ChevronRight size={11} />
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-neutral-900 dark:hover:text-neutral-200"
          title="Open PR on GitHub"
        >
          PR #{pr.number}
        </a>

        <div className="ml-auto flex items-center gap-1">
          <NeighbourButton dir="prev" target={prev} username={username} />
          <NeighbourButton dir="next" target={next} username={username} />
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-baseline gap-3">
        <PRStateChip state={pr.state} />
        <h1 className="text-base font-semibold leading-tight">{pr.title}</h1>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-neutral-600 dark:text-neutral-400">
        <span>
          {pr.mergedAt
            ? `Merged ${format(parseISO(pr.mergedAt), "MMM d, yyyy")}`
            : pr.closedAt
              ? `Closed ${format(parseISO(pr.closedAt), "MMM d, yyyy")}`
              : `Opened ${format(parseISO(pr.createdAt), "MMM d, yyyy")}`}
        </span>
        <span className="text-emerald-600 dark:text-emerald-400">
          +{pr.additions.toLocaleString()}
        </span>
        <span className="text-rose-600 dark:text-rose-400">
          −{pr.deletions.toLocaleString()}
        </span>
        <span>{pr.changedFiles} files</span>
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
        >
          GitHub <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

function NeighbourButton({
  dir,
  target,
  username,
}: {
  dir: "prev" | "next";
  target: PRNeighbour | null;
  username: string;
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  if (!target) {
    return (
      <button
        disabled
        className="rounded p-1 text-neutral-300 dark:text-neutral-700"
        title={dir === "prev" ? "No previous PR" : "No next PR"}
      >
        <Icon size={13} />
      </button>
    );
  }
  const [owner, repo] = target.repo.split("/");
  const href = `/u/${username}/pr/${owner}/${repo}/${target.number}`;
  return (
    <Link
      href={href}
      title={`${dir === "prev" ? "Previous" : "Next"}: ${target.title}`}
      className="rounded p-1 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      <Icon size={13} />
    </Link>
  );
}

function PRStateChip({ state }: { state: PRNode["state"] }) {
  if (state === "MERGED") {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
          "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
        )}
      >
        <GitMerge size={11} /> Merged
      </span>
    );
  }
  if (state === "CLOSED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
        <GitPullRequestClosed size={11} /> Closed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
      <GitPullRequestArrow size={11} /> Open
    </span>
  );
}
