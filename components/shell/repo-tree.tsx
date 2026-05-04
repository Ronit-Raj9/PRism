"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import {
  ChevronDown,
  ChevronRight,
  GitMerge,
  GitPullRequestArrow,
  GitPullRequestClosed,
  Star,
} from "lucide-react";
import type { PRState } from "@/types/github";
import type { SlimPR, SlimIssue } from "@/lib/classify";
import { useStoredSet } from "./use-stored-set";

export interface RepoTreeGroup {
  repo: string;
  ownerLogin: string;
  stars: number;
  prs: SlimPR[];
  issues: SlimIssue[];
  mergedPRs: number;
  totalAdditions: number;
  totalDeletions: number;
}

interface Props {
  username: string;
  groups: RepoTreeGroup[];
  storageKey: string;
}

type StateFilter = "all" | "merged" | "open" | "closed";

const PRE_OPEN_LIMIT = 5;
const PR_PATH = /^\/u\/[^/]+\/pr\/([^/]+)\/([^/]+)\/(\d+)/;

function activePRFromPath(pathname: string): {
  repo: string;
  number: number;
} | null {
  if (!pathname) return null;
  const m = PR_PATH.exec(pathname);
  if (!m) return null;
  return { repo: `${m[1]}/${m[2]}`, number: Number(m[3]) };
}

export function RepoTree({ username, groups, storageKey }: Props) {
  const pathname = usePathname() ?? "";
  const activePR = useMemo(() => activePRFromPath(pathname), [pathname]);
  const [expanded, writeExpanded] = useStoredSet(storageKey);
  const [showAllFor, setShowAllFor] = useState<Set<string>>(() => new Set());
  const [stateFilterFor, setStateFilterFor] = useState<Map<string, StateFilter>>(
    () => new Map(),
  );

  const effectivelyExpanded = useMemo(() => {
    if (!activePR) return expanded;
    if (expanded.has(activePR.repo)) return expanded;
    if (!groups.some((g) => g.repo === activePR.repo)) return expanded;
    const next = new Set(expanded);
    next.add(activePR.repo);
    return next;
  }, [expanded, activePR, groups]);

  const toggle = useCallback(
    (repo: string) => {
      const next = new Set(expanded);
      if (next.has(repo)) next.delete(repo);
      else next.add(repo);
      writeExpanded(next);
    },
    [expanded, writeExpanded],
  );

  const expandShowAll = useCallback((repo: string) => {
    setShowAllFor((prev) => {
      const next = new Set(prev);
      next.add(repo);
      return next;
    });
  }, []);

  const setStateFilter = useCallback((repo: string, f: StateFilter) => {
    setStateFilterFor((prev) => {
      const next = new Map(prev);
      if (f === "all") next.delete(repo);
      else next.set(repo, f);
      return next;
    });
  }, []);

  if (groups.length === 0) {
    return (
      <p className="px-3 py-2 text-[11px] italic text-neutral-500">
        No repositories match.
      </p>
    );
  }

  return (
    <ul className="space-y-px">
      {groups.map((g) => (
        <RepoRow
          key={g.repo}
          group={g}
          username={username}
          isOpen={effectivelyExpanded.has(g.repo)}
          showAll={showAllFor.has(g.repo)}
          stateFilter={stateFilterFor.get(g.repo) ?? "all"}
          activePRNumber={activePR?.repo === g.repo ? activePR.number : null}
          onToggle={toggle}
          onExpandShowAll={expandShowAll}
          onSetStateFilter={setStateFilter}
        />
      ))}
    </ul>
  );
}

interface RepoRowProps {
  group: RepoTreeGroup;
  username: string;
  isOpen: boolean;
  showAll: boolean;
  stateFilter: StateFilter;
  activePRNumber: number | null;
  onToggle: (repo: string) => void;
  onExpandShowAll: (repo: string) => void;
  onSetStateFilter: (repo: string, f: StateFilter) => void;
}

const RepoRow = memo(function RepoRow({
  group: g,
  username,
  isOpen,
  showAll,
  stateFilter,
  activePRNumber,
  onToggle,
  onExpandShowAll,
  onSetStateFilter,
}: RepoRowProps) {
  // Sort once per PR list. Re-runs only when the PR list itself changes
  // (server-shaped, so basically once per profile fetch), NOT on every
  // sidebar filter keystroke.
  const sortedPRs = useMemo(
    () =>
      [...g.prs].sort(
        (a, b) =>
          new Date(b.mergedAt ?? b.createdAt).getTime() -
          new Date(a.mergedAt ?? a.createdAt).getTime(),
      ),
    [g.prs],
  );

  const counts = useMemo(() => {
    let openC = 0;
    let closedC = 0;
    for (const p of g.prs) {
      if (p.state === "OPEN") openC++;
      else if (p.state === "CLOSED") closedC++;
    }
    return { openC, closedC };
  }, [g.prs]);

  const filteredPRs = useMemo(() => {
    if (stateFilter === "all") return sortedPRs;
    const target =
      stateFilter === "merged"
        ? "MERGED"
        : stateFilter === "open"
          ? "OPEN"
          : "CLOSED";
    return sortedPRs.filter((p) => p.state === target);
  }, [sortedPRs, stateFilter]);

  const visiblePRs = showAll ? filteredPRs : filteredPRs.slice(0, PRE_OPEN_LIMIT);
  const remaining = filteredPRs.length - visiblePRs.length;
  const [owner, repoName] = g.repo.split("/");

  return (
    <li>
      <button
        onClick={() => onToggle(g.repo)}
        className="flex w-full items-center gap-1 px-2 py-1 text-left transition hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
      >
        {isOpen ? (
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

      {isOpen ? (
        <div className="pl-5 pr-2 pb-1.5">
          <MiniStats
            total={g.prs.length}
            merged={g.mergedPRs}
            open={counts.openC}
            closed={counts.closedC}
            added={g.totalAdditions}
            removed={g.totalDeletions}
            active={stateFilter}
            setActive={(f) => onSetStateFilter(g.repo, f)}
          />
          <ul className="mt-1 space-y-px">
            {visiblePRs.length === 0 ? (
              <li className="px-1 py-1 text-[10.5px] italic text-neutral-500">
                No PRs match.
              </li>
            ) : (
              visiblePRs.map((pr) => {
                const isActive = activePRNumber === pr.number;
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
              })
            )}
          </ul>
          {remaining > 0 ? (
            <button
              onClick={() => onExpandShowAll(g.repo)}
              className="mt-0.5 px-1 py-0.5 text-[10.5px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              ··· {remaining} more ↓
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
});

function MiniStats({
  total,
  merged,
  open,
  closed,
  added,
  removed,
  active,
  setActive,
}: {
  total: number;
  merged: number;
  open: number;
  closed: number;
  added: number;
  removed: number;
  active: StateFilter;
  setActive: (f: StateFilter) => void;
}) {
  return (
    <div className="space-y-1 rounded bg-neutral-100 p-1 dark:bg-neutral-800/60">
      <div className="flex items-center gap-1 text-[9.5px]">
        <Pill
          active={active === "all"}
          onClick={() => setActive("all")}
          color="neutral"
        >
          All {total}
        </Pill>
        <Pill
          active={active === "merged"}
          onClick={() => setActive("merged")}
          color="violet"
          disabled={merged === 0}
        >
          ⊙ {merged}
        </Pill>
        <Pill
          active={active === "open"}
          onClick={() => setActive("open")}
          color="emerald"
          disabled={open === 0}
        >
          ↗ {open}
        </Pill>
        <Pill
          active={active === "closed"}
          onClick={() => setActive("closed")}
          color="rose"
          disabled={closed === 0}
        >
          ✕ {closed}
        </Pill>
      </div>
      <div className="flex items-center gap-2 px-1 font-mono text-[9.5px] text-neutral-500">
        <span className="text-emerald-700 dark:text-emerald-400">
          +{fmtCount(added)}
        </span>
        <span className="text-rose-700 dark:text-rose-400">
          −{fmtCount(removed)}
        </span>
        <span>loc</span>
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  color,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: "neutral" | "violet" | "emerald" | "rose";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const cls = clsx(
    "rounded px-1.5 py-0.5 transition",
    disabled && "cursor-not-allowed opacity-40",
    !disabled && !active && "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700",
    active && color === "neutral" && "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
    active && color === "violet" && "bg-violet-500 text-white",
    active && color === "emerald" && "bg-emerald-500 text-white",
    active && color === "rose" && "bg-rose-500 text-white",
  );
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={cls}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function PRStateIcon({ state }: { state: PRState }) {
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
