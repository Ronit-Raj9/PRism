"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import clsx from "clsx";
import type { PRNode } from "@/types/github";
import { MarkdownBody } from "./markdown-body";
import { CommentList, ReviewList } from "./comment-thread";
import { PRDiffViewer } from "./pr-diff-viewer";

interface Props {
  pr: PRNode;
}

type Section = "description" | "diff" | "discussion" | "reviews";

export function PRDetail({ pr }: Props) {
  const [section, setSection] = useState<Section>("diff");
  const [owner, repo] = pr.repo.nameWithOwner.split("/");

  const reviewCommentCount = pr.reviews.reduce((s, r) => s + r.comments.length, 0);
  const allReviewComments = pr.reviews.flatMap((r) => r.comments);

  const tabs: { id: Section; label: string; count?: number }[] = [
    { id: "diff", label: "Diff", count: pr.changedFiles },
    { id: "description", label: "Description" },
    { id: "discussion", label: "Discussion", count: pr.comments.length },
    { id: "reviews", label: "Reviews", count: pr.reviews.length + reviewCommentCount },
  ];

  return (
    <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
        <span>Opened {format(parseISO(pr.createdAt), "MMM d, yyyy")}</span>
        {pr.mergedAt ? (
          <span>· Merged {format(parseISO(pr.mergedAt), "MMM d, yyyy")}</span>
        ) : null}
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        >
          Open on GitHub ↗
        </a>
      </div>

      <div className="mb-3 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={clsx(
              "px-3 py-1.5 text-xs font-medium transition",
              section === t.id
                ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
            )}
          >
            {t.label}
            {t.count !== undefined ? (
              <span className="ml-1 text-neutral-500">{t.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div>
        {section === "description" ? (
          <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
            <MarkdownBody body={pr.body} />
          </div>
        ) : null}
        {section === "diff" ? (
          <PRDiffViewer
            owner={owner}
            repo={repo}
            prNumber={pr.number}
            reviewComments={allReviewComments}
          />
        ) : null}
        {section === "discussion" ? (
          pr.comments.length > 0 ? (
            <CommentList comments={pr.comments} />
          ) : (
            <p className="text-sm italic text-neutral-500">No discussion comments.</p>
          )
        ) : null}
        {section === "reviews" ? (
          pr.reviews.length > 0 ? (
            <ReviewList reviews={pr.reviews} />
          ) : (
            <p className="text-sm italic text-neutral-500">No reviews.</p>
          )
        ) : null}
      </div>
    </div>
  );
}

export function PRStatusBadge({ pr }: { pr: PRNode }) {
  const map = {
    OPEN: pr.isDraft
      ? { label: "draft", cls: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" }
      : { label: "open", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
    MERGED: {
      label: "merged",
      cls: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
    },
    CLOSED: {
      label: "closed",
      cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    },
  } as const;
  const { label, cls } = map[pr.state];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
