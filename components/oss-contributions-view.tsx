"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { format, parseISO } from "date-fns";
import type { PRNode, IssueNode, ContributedRepo } from "@/types/github";
import { groupByRepo, type ProjectGroup } from "@/lib/classify";
import { PRDetail, PRStatusBadge } from "./pr-detail";
import { CommentList } from "./comment-thread";
import { MarkdownBody } from "./markdown-body";

interface Props {
  prs: PRNode[];
  issues: IssueNode[];
  contributedRepos: ContributedRepo[];
}

type Filter = "all" | "merged" | "major";

export function OSSContributionsView({ prs, issues, contributedRepos }: Props) {
  const params = useParams<{ username: string }>();
  const username = params?.username ? decodeURIComponent(params.username) : "";
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const groups = useMemo(() => groupByRepo(prs, issues), [prs, issues]);

  const filteredGroups = useMemo(() => {
    if (filter === "all") return groups;
    if (filter === "merged") return groups.filter((g) => g.mergedPRs > 0);
    return groups.filter((g) => g.stars >= 1000);
  }, [groups, filter]);

  // Repos contributed-to that don't have any PRs/issues we captured
  // (e.g. via commit-only contributions). Show them as a secondary section.
  const groupedRepoSet = new Set(groups.map((g) => g.repo));
  const commitOnlyRepos = contributedRepos.filter(
    (r) => !groupedRepoSet.has(r.nameWithOwner),
  );

  if (groups.length === 0 && contributedRepos.length === 0) {
    return (
      <EmptyState
        title="No external contributions found"
        body="This user hasn't opened a PR or issue in any repo they don't own — at least not in their public history."
      />
    );
  }

  const totalMerged = groups.reduce((s, g) => s + g.mergedPRs, 0);
  const totalLOC = groups.reduce((s, g) => s + g.totalAdditions, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-neutral-700 dark:text-neutral-300">
          <strong className="text-neutral-900 dark:text-neutral-100">
            {totalMerged}
          </strong>{" "}
          PRs merged across{" "}
          <strong className="text-neutral-900 dark:text-neutral-100">
            {groups.length}
          </strong>{" "}
          external project{groups.length === 1 ? "" : "s"} ·{" "}
          <strong className="text-neutral-900 dark:text-neutral-100">
            +{totalLOC.toLocaleString()}
          </strong>{" "}
          lines added
        </div>
        <div className="ml-auto flex gap-1 rounded-md border border-neutral-300 bg-white p-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900">
          {[
            { id: "all" as Filter, label: "All" },
            { id: "merged" as Filter, label: "Merged only" },
            { id: "major" as Filter, label: "1k+ stars" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={clsx(
                "rounded px-3 py-1 transition",
                filter === f.id
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filteredGroups.map((g) => (
          <ProjectGroupCard
            key={g.repo}
            group={g}
            username={username}
            expanded={expanded === g.repo}
            onToggle={() =>
              setExpanded((e) => (e === g.repo ? null : g.repo))
            }
          />
        ))}
        {filteredGroups.length === 0 ? (
          <EmptyState
            title="No projects match this filter"
            body="Try a different filter — there are projects in other categories."
          />
        ) : null}
      </div>

      {commitOnlyRepos.length > 0 && filter === "all" ? (
        <div className="mt-8">
          <h3 className="mb-2 text-sm font-semibold">
            Other repos contributed to ({commitOnlyRepos.length})
          </h3>
          <p className="mb-3 text-xs text-neutral-500">
            These repos show up in their contribution history (commits, comments, or reviews) but didn&apos;t surface PRs or issues we could fetch directly.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {commitOnlyRepos.slice(0, 50).map((r) => (
              <a
                key={r.nameWithOwner}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-baseline justify-between gap-3 rounded-md border border-neutral-200 bg-white p-3 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
              >
                <span className="truncate text-sm font-medium">
                  {r.nameWithOwner}
                </span>
                <span className="shrink-0 text-xs text-neutral-500">
                  ★ {r.stargazerCount.toLocaleString()}
                </span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectGroupCard({
  group,
  username,
  expanded,
  onToggle,
}: {
  group: ProjectGroup;
  username: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [owner, repo] = group.repo.split("/");
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex w-full items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span
            className={clsx(
              "shrink-0 text-neutral-400 transition",
              expanded ? "rotate-90" : "",
            )}
          >
            ▶
          </span>
          <span className="flex flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold">{group.repo}</span>
            <span className="text-xs text-neutral-500">
              ★ {group.stars.toLocaleString()}
            </span>
          </span>
        <span className="flex shrink-0 flex-wrap gap-1.5 text-xs">
          {group.mergedPRs > 0 ? (
            <Pill cls="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
              {group.mergedPRs} merged
            </Pill>
          ) : null}
          {group.prs.length > 0 ? (
            <Pill cls="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {group.prs.length} PR{group.prs.length === 1 ? "" : "s"}
            </Pill>
          ) : null}
          {group.issues.length > 0 ? (
            <Pill cls="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {group.issues.length} issue{group.issues.length === 1 ? "" : "s"}
            </Pill>
          ) : null}
          {group.totalAdditions > 0 ? (
            <Pill cls="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
              +{group.totalAdditions.toLocaleString()}
            </Pill>
          ) : null}
        </span>
        </button>
        {username ? (
          <Link
            href={`/u/${username}/r/${owner}/${repo}`}
            className="shrink-0 rounded border border-neutral-300 px-2 py-1 text-[11px] text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
            title="Deep dive — full activity in this repo"
          >
            Deep dive →
          </Link>
        ) : null}
      </div>

      {expanded ? (
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          {group.prs.length > 0 ? (
            <div className="mb-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Pull requests
              </h4>
              <div className="space-y-2">
                {group.prs.map((pr) => (
                  <PRRowExpandable key={pr.number} pr={pr} />
                ))}
              </div>
            </div>
          ) : null}
          {group.issues.length > 0 ? (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Issues
              </h4>
              <div className="space-y-2">
                {group.issues.map((iss) => (
                  <IssueRowExpandable key={iss.number} issue={iss} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PRRowExpandable({ pr }: { pr: PRNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-baseline gap-2 px-3 py-2 text-left transition hover:bg-white dark:hover:bg-neutral-900"
      >
        <span className={clsx("text-xs text-neutral-400 transition", open ? "rotate-90" : "")}>
          ▶
        </span>
        <PRStatusBadge pr={pr} />
        <span className="flex-1 truncate text-sm">{pr.title}</span>
        <span className="shrink-0 text-xs text-neutral-500">
          <span className="text-emerald-700 dark:text-emerald-400">+{pr.additions}</span>{" "}
          <span className="text-rose-700 dark:text-rose-400">−{pr.deletions}</span>
          {" · "}
          {format(parseISO(pr.createdAt), "MMM d, yyyy")}
        </span>
      </button>
      {open ? <PRDetail pr={pr} /> : null}
    </div>
  );
}

function IssueRowExpandable({ issue }: { issue: IssueNode }) {
  const [open, setOpen] = useState(false);
  const stateCls =
    issue.state === "OPEN"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
  return (
    <div className="overflow-hidden rounded border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-baseline gap-2 px-3 py-2 text-left transition hover:bg-white dark:hover:bg-neutral-900"
      >
        <span className={clsx("text-xs text-neutral-400 transition", open ? "rotate-90" : "")}>
          ▶
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${stateCls}`}>
          {issue.state.toLowerCase()}
        </span>
        <span className="flex-1 truncate text-sm">{issue.title}</span>
        <span className="shrink-0 text-xs text-neutral-500">
          {issue.comments.length > 0 ? `💬 ${issue.comments.length} · ` : ""}
          {format(parseISO(issue.createdAt), "MMM d, yyyy")}
        </span>
      </button>
      {open ? (
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <div className="mb-3 flex flex-wrap gap-1">
            {issue.labels.map((l, i) => (
              <span
                key={i}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `#${l.color}33`,
                  color: `#${l.color}`,
                }}
              >
                {l.name}
              </span>
            ))}
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <MarkdownBody body={issue.body} />
          </div>
          {issue.comments.length > 0 ? (
            <div className="mt-3">
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {issue.comments.length} comment{issue.comments.length === 1 ? "" : "s"}
              </h5>
              <CommentList comments={issue.comments} />
            </div>
          ) : null}
          <div className="mt-3 text-right">
            <a
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Open on GitHub ↗
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Pill({ children, cls }: { children: React.ReactNode; cls: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{body}</p>
    </div>
  );
}
