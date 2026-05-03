"use client";

import { format, parseISO } from "date-fns";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import clsx from "clsx";
import type { PRNode } from "@/types/github";
import { MarkdownBody } from "./markdown-body";
import { CommentList, ReviewList } from "./comment-thread";

export function PRDetail({ pr }: { pr: PRNode }) {
  const pathname = usePathname();
  const m = /^\/u\/([^/]+)/.exec(pathname ?? "");
  const username = m?.[1] ?? pr.repo.ownerLogin;
  const [owner, repo] = pr.repo.nameWithOwner.split("/");
  return (
    <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
      <div className="mb-3 flex flex-wrap items-baseline gap-3 text-xs">
        <PRStatusBadge pr={pr} />
        <span className="font-mono text-neutral-500">
          {pr.repo.nameWithOwner}#{pr.number}
        </span>
        <span className="text-emerald-600 dark:text-emerald-400">
          +{pr.additions.toLocaleString()}
        </span>
        <span className="text-rose-600 dark:text-rose-400">
          −{pr.deletions.toLocaleString()}
        </span>
        <span className="text-neutral-500">
          {pr.changedFiles} file{pr.changedFiles === 1 ? "" : "s"} ·{" "}
          {pr.mergedAt
            ? `merged ${format(parseISO(pr.mergedAt), "MMM d, yyyy")}`
            : `opened ${format(parseISO(pr.createdAt), "MMM d, yyyy")}`}
        </span>
        <a
          href={`/u/${username}/pr/${owner}/${repo}/${pr.number}`}
          className="ml-auto inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
        >
          Open diff view →
        </a>
      </div>

      {pr.body ? (
        <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
          <MarkdownBody body={pr.body} />
        </div>
      ) : (
        <p className="text-sm italic text-neutral-500">No description.</p>
      )}

      {pr.comments.length > 0 ? (
        <div className="mt-3">
          <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {pr.comments.length} comment{pr.comments.length === 1 ? "" : "s"}
          </h5>
          <CommentList comments={pr.comments} />
        </div>
      ) : null}

      {pr.reviews.length > 0 ? (
        <div className="mt-3">
          <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {pr.reviews.length} review{pr.reviews.length === 1 ? "" : "s"}
          </h5>
          <ReviewList reviews={pr.reviews} />
        </div>
      ) : null}

      <div className="mt-2 text-right">
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          Open on GitHub <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}

export function PRStatusBadge({ pr }: { pr: PRNode }) {
  const label = pr.state === "MERGED" ? "Merged" : pr.state === "OPEN" ? "Open" : "Closed";
  const cls =
    pr.state === "MERGED"
      ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
      : pr.state === "OPEN"
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
        : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-0.5 text-[10px] font-medium",
        cls,
      )}
    >
      {label}
    </span>
  );
}
