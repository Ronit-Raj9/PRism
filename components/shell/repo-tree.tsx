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
      <p className="px-4 py-3 text-xs italic text-[var(--muted)]">No repositories match.</p>
    );
  }

  return (
    <ul className="space-y-0.5">
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
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--surface-2)]"
      >
        {isOpen ? (
          <ChevronDown size={14} strokeWidth={1.75} className="shrink-0 text-[var(--muted)]" />
        ) : (
          <ChevronRight size={14} strokeWidth={1.75} className="shrink-0 text-[var(--muted)]" />
        )}
        <span className="flex-1 truncate font-mono text-xs text-[var(--foreground)]">
          {g.repo}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-[var(--muted)]">
          <Star size={11} strokeWidth={1.75} className="fill-amber-400/80 text-amber-500" />
          {fmtCount(g.stars)}
        </span>
      </button>

      {isOpen ? (
        <div className="px-2 pb-2 pl-4">
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
              <li className="rounded-lg px-2 py-1.5 text-[11px] italic text-[var(--muted)]">
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
                        "flex items-center gap-2 rounded-lg py-1.5 pl-2 pr-2 text-[12px] transition",
                        isActive
                          ? "bg-indigo-500/12 text-[var(--foreground)] ring-1 ring-indigo-500/25"
                          : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                      )}
                      title={pr.title}
                    >
                      <PRStateIcon state={pr.state} />
                      <span className="min-w-0 flex-1 truncate">{pr.title}</span>
                      <span
                        className={clsx(
                          "shrink-0 text-[10px] tabular-nums",
                          pr.additions > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted)]",
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
              className="mt-1 w-full rounded-lg py-1.5 text-center text-[11px] text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              Show {remaining} more
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
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/80 p-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <Pill active={active === "all"} onClick={() => setActive("all")} color="neutral">
          All {total}
        </Pill>
        <Pill
          active={active === "merged"}
          onClick={() => setActive("merged")}
          color="violet"
          disabled={merged === 0}
        >
          {merged}
        </Pill>
        <Pill
          active={active === "open"}
          onClick={() => setActive("open")}
          color="emerald"
          disabled={open === 0}
        >
          {open}
        </Pill>
        <Pill
          active={active === "closed"}
          onClick={() => setActive("closed")}
          color="rose"
          disabled={closed === 0}
        >
          {closed}
        </Pill>
      </div>
      <div className="mt-1.5 flex items-center gap-2 px-1 font-mono text-[10px] text-[var(--muted)]">
        <span className="text-emerald-600 dark:text-emerald-400">+{fmtCount(added)}</span>
        <span className="text-rose-600 dark:text-rose-400">−{fmtCount(removed)}</span>
        <span>lines</span>
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
    "rounded-md px-2 py-1 text-[10px] font-medium tabular-nums transition",
    disabled && "cursor-not-allowed opacity-35",
    !disabled &&
      !active &&
      "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
    active && color === "neutral" && "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
    active && color === "violet" && "bg-violet-600 text-white",
    active && color === "emerald" && "bg-emerald-600 text-white",
    active && color === "rose" && "bg-rose-600 text-white",
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
