"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  ChevronDown,
  ChevronRight,
  GitPullRequest,
  GitPullRequestClosed,
  CircleDot,
  House,
  Star,
} from "lucide-react";
import type { PRNode, IssueNode } from "@/types/github";
import type { ProjectGroup } from "@/lib/classify";
import { prTabId, issueTabId } from "./types";

interface Props {
  repoGroups: ProjectGroup[];
  ownPRs: PRNode[];
  activeTabId: string;
  onOpenPR: (pr: PRNode) => void;
  onOpenIssue: (issue: IssueNode) => void;
  onOpenOverview: () => void;
}

export function ExplorerView({
  repoGroups,
  ownPRs,
  activeTabId,
  onOpenPR,
  onOpenIssue,
  onOpenOverview,
}: Props) {
  // Top: pinned "Overview" entry
  // Then: external repos (sorted)
  // Then: own PRs grouped (collapsible)
  return (
    <div className="py-1 text-xs">
      <PinnedRow
        active={activeTabId === "overview"}
        onClick={onOpenOverview}
      />

      <SectionHeader label={`External · ${repoGroups.length}`} />
      {repoGroups.map((g) => (
        <RepoNode
          key={g.repo}
          group={g}
          activeTabId={activeTabId}
          onOpenPR={onOpenPR}
          onOpenIssue={onOpenIssue}
        />
      ))}

      {ownPRs.length > 0 ? (
        <>
          <SectionHeader label={`Own PRs · ${ownPRs.length}`} />
          <OwnPRsNode
            prs={ownPRs}
            activeTabId={activeTabId}
            onOpenPR={onOpenPR}
          />
        </>
      ) : null}
    </div>
  );
}

function PinnedRow({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2 px-3 py-1 text-left transition",
        active
          ? "bg-blue-100 text-neutral-900 dark:bg-blue-900/40 dark:text-neutral-100"
          : "text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800/60",
      )}
    >
      <House size={12} strokeWidth={2} className="shrink-0 text-blue-500" />
      <span className="flex-1 font-medium">Overview</span>
    </button>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mt-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
      {label}
    </div>
  );
}

function RepoNode({
  group,
  activeTabId,
  onOpenPR,
  onOpenIssue,
}: {
  group: ProjectGroup;
  activeTabId: string;
  onOpenPR: (pr: PRNode) => void;
  onOpenIssue: (issue: IssueNode) => void;
}) {
  const hasActive = useMemo(() => {
    return (
      group.prs.some((p) => prTabId(p) === activeTabId) ||
      group.issues.some((i) => issueTabId(i) === activeTabId)
    );
  }, [group, activeTabId]);

  const [open, setOpen] = useState(hasActive || group.mergedPRs > 0);

  // Compact label: trim long owner/repo
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 px-2 py-1 text-left text-neutral-800 transition hover:bg-neutral-200/60 dark:text-neutral-200 dark:hover:bg-neutral-800/60"
      >
        {open ? (
          <ChevronDown size={12} strokeWidth={2} className="shrink-0 text-neutral-500" />
        ) : (
          <ChevronRight size={12} strokeWidth={2} className="shrink-0 text-neutral-500" />
        )}
        <span className="flex-1 truncate font-medium">{group.repo}</span>
        <span className="flex shrink-0 items-center gap-1 text-[10px] text-neutral-500">
          <Star size={10} strokeWidth={2} />
          {compactNumber(group.stars)}
        </span>
      </button>
      {open ? (
        <div>
          {group.prs.map((pr) => (
            <PRRow
              key={pr.number}
              pr={pr}
              active={prTabId(pr) === activeTabId}
              onOpen={() => onOpenPR(pr)}
            />
          ))}
          {group.issues.map((iss) => (
            <IssueRow
              key={iss.number}
              issue={iss}
              active={issueTabId(iss) === activeTabId}
              onOpen={() => onOpenIssue(iss)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OwnPRsNode({
  prs,
  activeTabId,
  onOpenPR,
}: {
  prs: PRNode[];
  activeTabId: string;
  onOpenPR: (pr: PRNode) => void;
}) {
  const [open, setOpen] = useState(false);
  // Group own PRs by repo
  const byRepo = useMemo(() => {
    const m = new Map<string, PRNode[]>();
    for (const pr of prs) {
      const arr = m.get(pr.repo.nameWithOwner) ?? [];
      arr.push(pr);
      m.set(pr.repo.nameWithOwner, arr);
    }
    return Array.from(m.entries());
  }, [prs]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 px-2 py-1 text-left text-neutral-800 transition hover:bg-neutral-200/60 dark:text-neutral-200 dark:hover:bg-neutral-800/60"
      >
        {open ? (
          <ChevronDown size={12} strokeWidth={2} className="shrink-0 text-neutral-500" />
        ) : (
          <ChevronRight size={12} strokeWidth={2} className="shrink-0 text-neutral-500" />
        )}
        <span className="flex-1 truncate font-medium">Own repos</span>
        <span className="text-[10px] text-neutral-500">{byRepo.length}</span>
      </button>
      {open
        ? byRepo.map(([repo, list]) => (
            <OwnRepoNode
              key={repo}
              repo={repo}
              prs={list}
              activeTabId={activeTabId}
              onOpenPR={onOpenPR}
            />
          ))
        : null}
    </div>
  );
}

function OwnRepoNode({
  repo,
  prs,
  activeTabId,
  onOpenPR,
}: {
  repo: string;
  prs: PRNode[];
  activeTabId: string;
  onOpenPR: (pr: PRNode) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 px-2 py-1 pl-5 text-left text-neutral-700 transition hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800/60"
      >
        {open ? (
          <ChevronDown size={11} strokeWidth={2} className="shrink-0 text-neutral-500" />
        ) : (
          <ChevronRight size={11} strokeWidth={2} className="shrink-0 text-neutral-500" />
        )}
        <span className="flex-1 truncate">{repo}</span>
        <span className="text-[10px] text-neutral-500">{prs.length}</span>
      </button>
      {open
        ? prs.map((pr) => (
            <PRRow
              key={pr.number}
              pr={pr}
              active={prTabId(pr) === activeTabId}
              onOpen={() => onOpenPR(pr)}
              indented
            />
          ))
        : null}
    </div>
  );
}

function PRRow({
  pr,
  active,
  onOpen,
  indented = false,
}: {
  pr: PRNode;
  active: boolean;
  onOpen: () => void;
  indented?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx(
        "flex w-full items-center gap-2 py-1 pr-2 text-left transition",
        indented ? "pl-9" : "pl-7",
        active
          ? "bg-blue-100 text-neutral-900 dark:bg-blue-900/40 dark:text-neutral-100"
          : "text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800/60",
      )}
      title={`#${pr.number} — ${pr.title}`}
    >
      <PRStateIcon state={pr.state} draft={pr.isDraft} />
      <span className="flex-1 truncate">{pr.title}</span>
      <span className="shrink-0 text-[10px] text-emerald-600 dark:text-emerald-400">
        +{compactNumber(pr.additions)}
      </span>
    </button>
  );
}

function IssueRow({
  issue,
  active,
  onOpen,
}: {
  issue: IssueNode;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx(
        "flex w-full items-center gap-2 py-1 pl-7 pr-2 text-left transition",
        active
          ? "bg-blue-100 text-neutral-900 dark:bg-blue-900/40 dark:text-neutral-100"
          : "text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800/60",
      )}
      title={`#${issue.number} — ${issue.title}`}
    >
      <CircleDot
        size={11}
        strokeWidth={2}
        className={clsx(
          "shrink-0",
          issue.state === "OPEN" ? "text-emerald-500" : "text-rose-500",
        )}
      />
      <span className="flex-1 truncate">{issue.title}</span>
      {issue.comments.length > 0 ? (
        <span className="shrink-0 text-[10px] text-neutral-500">
          💬 {issue.comments.length}
        </span>
      ) : null}
    </button>
  );
}

function PRStateIcon({ state, draft }: { state: PRNode["state"]; draft: boolean }) {
  if (state === "MERGED")
    return <GitPullRequest size={11} strokeWidth={2} className="shrink-0 text-violet-500" />;
  if (state === "OPEN")
    return (
      <GitPullRequest
        size={11}
        strokeWidth={2}
        className={clsx("shrink-0", draft ? "text-neutral-400" : "text-emerald-500")}
      />
    );
  return <GitPullRequestClosed size={11} strokeWidth={2} className="shrink-0 text-rose-500" />;
}

function compactNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}
