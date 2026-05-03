"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search, GitPullRequest, CircleDot } from "lucide-react";
import type { PRNode, IssueNode } from "@/types/github";

interface Props {
  prs: PRNode[];
  issues: IssueNode[];
  onOpenPR: (pr: PRNode) => void;
  onOpenIssue: (issue: IssueNode) => void;
}

type Scope = "all" | "prs" | "issues" | "diffs";

export function SearchSidebar({ prs, issues, onOpenPR, onOpenIssue }: Props) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  const results = useMemo(() => {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) return { prs: [], issues: [] };

    const matchPR = (p: PRNode) =>
      p.title.toLowerCase().includes(trimmed) ||
      p.body.toLowerCase().includes(trimmed) ||
      p.repo.nameWithOwner.toLowerCase().includes(trimmed);

    const matchIssue = (i: IssueNode) =>
      i.title.toLowerCase().includes(trimmed) ||
      i.body.toLowerCase().includes(trimmed) ||
      i.repo.nameWithOwner.toLowerCase().includes(trimmed);

    return {
      prs:
        scope === "issues" ? [] : prs.filter(matchPR).slice(0, 50),
      issues:
        scope === "prs" ? [] : issues.filter(matchIssue).slice(0, 50),
    };
  }, [q, scope, prs, issues]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 p-2 dark:border-neutral-800">
        <div className="relative">
          <Search
            size={12}
            strokeWidth={2}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code, PRs, comments..."
            autoFocus
            className="w-full rounded border border-neutral-300 bg-white py-1 pl-7 pr-2 text-xs outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>
        <div className="mt-2 flex gap-1 text-[10px]">
          {(["all", "prs", "issues"] as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={clsx(
                "rounded px-2 py-0.5 transition",
                scope === s
                  ? "bg-blue-500 text-white"
                  : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800",
              )}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto py-1 text-xs">
        {!q.trim() ? (
          <div className="px-3 py-4 text-[11px] text-neutral-500">
            Type to search through PRs, issues, and comments.
          </div>
        ) : results.prs.length + results.issues.length === 0 ? (
          <div className="px-3 py-4 text-[11px] text-neutral-500">
            No matches.
          </div>
        ) : (
          <>
            {results.prs.length > 0 ? (
              <SidebarSection label={`Pull requests · ${results.prs.length}`}>
                {results.prs.map((pr) => (
                  <button
                    key={`${pr.repo.nameWithOwner}#${pr.number}`}
                    onClick={() => onOpenPR(pr)}
                    className="flex w-full items-center gap-2 px-3 py-1 text-left transition hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
                    title={pr.title}
                  >
                    <GitPullRequest
                      size={11}
                      strokeWidth={2}
                      className={clsx(
                        "shrink-0",
                        pr.state === "MERGED"
                          ? "text-violet-500"
                          : pr.state === "OPEN"
                            ? "text-emerald-500"
                            : "text-rose-500",
                      )}
                    />
                    <span className="flex-1 truncate">{pr.title}</span>
                    <span className="shrink-0 truncate text-[10px] text-neutral-500">
                      {pr.repo.nameWithOwner.split("/")[1]}
                    </span>
                  </button>
                ))}
              </SidebarSection>
            ) : null}
            {results.issues.length > 0 ? (
              <SidebarSection label={`Issues · ${results.issues.length}`}>
                {results.issues.map((iss) => (
                  <button
                    key={`${iss.repo.nameWithOwner}#${iss.number}`}
                    onClick={() => onOpenIssue(iss)}
                    className="flex w-full items-center gap-2 px-3 py-1 text-left transition hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
                    title={iss.title}
                  >
                    <CircleDot
                      size={11}
                      strokeWidth={2}
                      className={clsx(
                        "shrink-0",
                        iss.state === "OPEN" ? "text-emerald-500" : "text-rose-500",
                      )}
                    />
                    <span className="flex-1 truncate">{iss.title}</span>
                    <span className="shrink-0 truncate text-[10px] text-neutral-500">
                      {iss.repo.nameWithOwner.split("/")[1]}
                    </span>
                  </button>
                ))}
              </SidebarSection>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      {children}
    </div>
  );
}
