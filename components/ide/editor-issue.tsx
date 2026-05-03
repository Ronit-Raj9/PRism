"use client";

import { format, parseISO } from "date-fns";
import { ExternalLink, ChevronRight } from "lucide-react";
import type { IssueNode } from "@/types/github";
import { MarkdownBody } from "@/components/markdown-body";
import { CommentList } from "@/components/comment-thread";

export function EditorIssue({ issue }: { issue: IssueNode }) {
  const [owner, repo] = issue.repo.nameWithOwner.split("/");
  const stateCls =
    issue.state === "OPEN"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-neutral-100/60 px-4 py-1.5 text-[11px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
        <span>{owner}</span>
        <ChevronRight size={11} />
        <span>{repo}</span>
        <ChevronRight size={11} />
        <span>Issue #{issue.number}</span>
        <ChevronRight size={11} />
        <span className="truncate text-neutral-700 dark:text-neutral-300">
          {issue.title}
        </span>
      </div>

      <div className="shrink-0 border-b border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-wrap items-baseline gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${stateCls}`}
          >
            {issue.state.toLowerCase()}
          </span>
          <h1 className="text-base font-semibold">{issue.title}</h1>
          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            Open on GitHub
            <ExternalLink size={11} />
          </a>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
          <span>Opened {format(parseISO(issue.createdAt), "MMM d, yyyy")}</span>
          {issue.closedAt ? (
            <span>· Closed {format(parseISO(issue.closedAt), "MMM d, yyyy")}</span>
          ) : null}
          <span>· {issue.comments.length} comments</span>
        </div>
        {issue.labels.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {issue.labels.map((l, i) => (
              <span
                key={i}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `#${l.color}33`, color: `#${l.color}` }}
              >
                {l.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <MarkdownBody body={issue.body} />
        </div>
        {issue.comments.length > 0 ? (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {issue.comments.length} comment
              {issue.comments.length === 1 ? "" : "s"}
            </h3>
            <CommentList comments={issue.comments} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
