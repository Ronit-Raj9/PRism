"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { GitPullRequest, CircleDot, Search } from "lucide-react";
import type { PRNode, IssueNode } from "@/types/github";

interface Props {
  prs: PRNode[];
  issues: IssueNode[];
  onOpenPR: (pr: PRNode) => void;
  onOpenIssue: (issue: IssueNode) => void;
}

export function EditorSearch({ prs, issues, onOpenPR, onOpenIssue }: Props) {
  const [q, setQ] = useState("");

  const trimmed = q.trim().toLowerCase();
  const matchedPRs = useMemo(() => {
    if (!trimmed) return [];
    return prs
      .filter(
        (p) =>
          p.title.toLowerCase().includes(trimmed) ||
          p.body.toLowerCase().includes(trimmed) ||
          p.repo.nameWithOwner.toLowerCase().includes(trimmed),
      )
      .slice(0, 100);
  }, [prs, trimmed]);

  const matchedIssues = useMemo(() => {
    if (!trimmed) return [];
    return issues
      .filter(
        (i) =>
          i.title.toLowerCase().includes(trimmed) ||
          i.body.toLowerCase().includes(trimmed) ||
          i.repo.nameWithOwner.toLowerCase().includes(trimmed),
      )
      .slice(0, 100);
  }, [issues, trimmed]);

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-4 text-lg font-semibold">Search</h1>
      <div className="relative">
        <Search
          size={14}
          strokeWidth={2}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
        />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search across PRs, issues, comments..."
          autoFocus
          className="w-full rounded-md border border-neutral-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {trimmed ? (
        <div className="mt-2 text-xs text-neutral-500">
          {matchedPRs.length + matchedIssues.length} result
          {matchedPRs.length + matchedIssues.length === 1 ? "" : "s"}
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {matchedPRs.length > 0 ? (
          <ResultSection title={`Pull requests · ${matchedPRs.length}`}>
            {matchedPRs.map((pr) => (
              <button
                key={`${pr.repo.nameWithOwner}#${pr.number}`}
                onClick={() => onOpenPR(pr)}
                className="flex w-full items-baseline gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 text-left transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
              >
                <GitPullRequest
                  size={14}
                  className={clsx(
                    "shrink-0 self-center",
                    pr.state === "MERGED"
                      ? "text-violet-500"
                      : pr.state === "OPEN"
                        ? "text-emerald-500"
                        : "text-rose-500",
                  )}
                />
                <span className="flex-1 truncate text-sm">{pr.title}</span>
                <span className="shrink-0 text-[11px] text-neutral-500">
                  {pr.repo.nameWithOwner} · +{pr.additions}
                </span>
              </button>
            ))}
          </ResultSection>
        ) : null}
        {matchedIssues.length > 0 ? (
          <ResultSection title={`Issues · ${matchedIssues.length}`}>
            {matchedIssues.map((iss) => (
              <button
                key={`${iss.repo.nameWithOwner}#${iss.number}`}
                onClick={() => onOpenIssue(iss)}
                className="flex w-full items-baseline gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 text-left transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
              >
                <CircleDot
                  size={14}
                  className={clsx(
                    "shrink-0 self-center",
                    iss.state === "OPEN" ? "text-emerald-500" : "text-rose-500",
                  )}
                />
                <span className="flex-1 truncate text-sm">{iss.title}</span>
                <span className="shrink-0 text-[11px] text-neutral-500">
                  {iss.repo.nameWithOwner}
                </span>
              </button>
            ))}
          </ResultSection>
        ) : null}
        {trimmed && matchedPRs.length + matchedIssues.length === 0 ? (
          <p className="text-sm text-neutral-500">No matches.</p>
        ) : null}
      </div>
    </div>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
