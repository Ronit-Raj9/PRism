"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { useStoredSet } from "./use-stored-set";
import {
  ChevronDown,
  ChevronRight,
  GitMerge,
  GitPullRequestArrow,
  GitPullRequestClosed,
  Star,
} from "lucide-react";
import type { PRNode, IssueNode } from "@/types/github";

export interface RepoTreeGroup {
  repo: string;
  ownerLogin: string;
  stars: number;
  prs: PRNode[];
  issues: IssueNode[];
  mergedPRs: number;
  totalAdditions: number;
  totalDeletions: number;
}

interface Props {
  username: string;
  groups: RepoTreeGroup[];
  storageKey: string;
}

const PRE_OPEN_LIMIT = 5;

const PR_PATH = /^\/u\/[^/]+\/pr\/([^/]+)\/([^/]+)\/(\d+)/;

function activePRFromPath(pathname: string | null): {
  repo: string;
  number: number;
} | null {
  if (!pathname) return null;
  const m = PR_PATH.exec(pathname);
  if (!m) return null;
  return { repo: `${m[1]}/${m[2]}`, number: Number(m[3]) };
}

export function RepoTree({ username, groups, storageKey }: Props) {
  const pathname = usePathname();
  const activePR = useMemo(() => activePRFromPath(pathname), [pathname]);
  const [expanded, writeExpanded] = useStoredSet(storageKey);
  const [showAllFor, setShowAllFor] = useState<Set<string>>(() => new Set());

  // Auto-expand the repo containing the active PR without mutating the
  // persisted set — derived, not stored.
  const effectivelyExpanded = useMemo(() => {
    if (!activePR) return expanded;
    if (expanded.has(activePR.repo)) return expanded;
    if (!groups.some((g) => g.repo === activePR.repo)) return expanded;
    const next = new Set(expanded);
    next.add(activePR.repo);
    return next;
  }, [expanded, activePR, groups]);

  function toggle(repo: string) {
    const next = new Set(expanded);
    if (next.has(repo)) next.delete(repo);
    else next.add(repo);
    writeExpanded(next);
  }

  function expandShowAll(repo: string) {
    setShowAllFor((prev) => {
      const next = new Set(prev);
      next.add(repo);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <p className="px-3 py-2 text-[11px] italic text-neutral-500">
        No contributions.
      </p>
    );
  }

  return (
    <ul className="space-y-px">
      {groups.map((g) => {
        const open = effectivelyExpanded.has(g.repo);
        const showAll = showAllFor.has(g.repo);
        const sortedPRs = [...g.prs].sort(
          (a, b) =>
            new Date(b.mergedAt ?? b.createdAt).getTime() -
            new Date(a.mergedAt ?? a.createdAt).getTime(),
        );
        const visiblePRs = showAll ? sortedPRs : sortedPRs.slice(0, PRE_OPEN_LIMIT);
        const remaining = sortedPRs.length - visiblePRs.length;

        return (
          <li key={g.repo}>
            <button
              onClick={() => toggle(g.repo)}
              className="flex w-full items-center gap-1 px-2 py-1 text-left transition hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
            >
              {open ? (
                <ChevronDown size={12} className="shrink-0 text-neutral-400" />
              ) : (
                <ChevronRight size={12} className="shrink-0 text-neutral-400" />
              )}
              <span className="flex-1 truncate font-mono text-[12px] text-neutral-800 dark:text-neutral-200">
                {g.repo}
              </span>
              <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-neutral-500">
                <Star size={10} className="fill-current" />
                {fmtCount(g.stars)}
              </span>
            </button>

            {open ? (
              <div className="pl-5 pr-2 pb-1">
                <MiniStats
                  prs={g.prs.length}
                  merged={g.mergedPRs}
                  added={g.totalAdditions}
                />
                <ul className="mt-1 space-y-px">
                  {visiblePRs.map((pr) => {
                    const isActive =
                      activePR?.repo === g.repo &&
                      activePR.number === pr.number;
                    const [owner, repoName] = g.repo.split("/");
                    return (
                      <li key={pr.number}>
                        <Link
                          href={`/u/${username}/pr/${owner}/${repoName}/${pr.number}`}
                          data-pr-row
                          data-pr-active={isActive ? "true" : undefined}
                          className={clsx(
                            "flex items-center gap-1.5 rounded-sm border-l-2 py-0.5 pl-1.5 pr-1 text-[11.5px] transition",
                            isActive
                              ? "border-teal-500 bg-teal-500/10 text-neutral-900 dark:text-neutral-50"
                              : "border-transparent text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800/50",
                          )}
                          title={pr.title}
                        >
                          <PRStateIcon state={pr.state} />
                          <span className="flex-1 truncate">{pr.title}</span>
                          <span
                            className={clsx(
                              "shrink-0 text-[10px] tabular-nums",
                              pr.additions > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-neutral-500",
                            )}
                          >
                            +{fmtCount(pr.additions)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {remaining > 0 ? (
                  <button
                    onClick={() => expandShowAll(g.repo)}
                    className="mt-0.5 px-1 py-0.5 text-[10.5px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    ··· {remaining} more ↓
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function MiniStats({
  prs,
  merged,
  added,
}: {
  prs: number;
  merged: number;
  added: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-400">
      <span title="PRs">
        <strong className="text-neutral-800 dark:text-neutral-100">{prs}</strong>↗
      </span>
      <span title="Merged">
        <strong className="text-violet-700 dark:text-violet-300">{merged}</strong>○
      </span>
      <span title="Lines added">
        <span className="text-emerald-700 dark:text-emerald-400">
          +{fmtCount(added)}
        </span>{" "}
        loc
      </span>
    </div>
  );
}

function PRStateIcon({ state }: { state: PRNode["state"] }) {
  if (state === "MERGED")
    return <GitMerge size={11} className="shrink-0 text-violet-500" />;
  if (state === "CLOSED")
    return <GitPullRequestClosed size={11} className="shrink-0 text-rose-500" />;
  return <GitPullRequestArrow size={11} className="shrink-0 text-emerald-500" />;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}
