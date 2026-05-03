"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { format, formatDistanceToNowStrict, subDays } from "date-fns";
import type { PRNode } from "@/types/github";
import type { TimelineEvent, EventKind } from "@/lib/timeline";
import { uniqueOrgs, uniqueRepos } from "@/lib/timeline";
import { PRDetail } from "./pr-detail";
import { CommentList, ReviewList } from "./comment-thread";
import { MarkdownBody } from "./markdown-body";

type Scope = "all" | "external" | "own";
type DateRange = "7d" | "30d" | "90d" | "1y" | "all";

const KIND_GROUPS: { id: EventKind[]; label: string }[] = [
  { id: ["PR_OPENED", "PR_MERGED", "PR_CLOSED"], label: "PRs" },
  { id: ["ISSUE_OPENED", "ISSUE_CLOSED"], label: "Issues" },
  { id: ["PR_COMMENT", "ISSUE_COMMENT"], label: "Comments" },
  { id: ["REVIEW_GIVEN", "REVIEW_COMMENT"], label: "Reviews" },
];

interface Props {
  events: TimelineEvent[];
}

export function TimelineView({ events }: Props) {
  const [scope, setScope] = useState<Scope>("all");
  const [dateRange, setDateRange] = useState<DateRange>("90d");
  const [enabledKinds, setEnabledKinds] = useState<Set<EventKind>>(
    () => new Set(KIND_GROUPS.flatMap((g) => g.id)),
  );
  const [orgFilter, setOrgFilter] = useState<string>("");
  const [repoFilter, setRepoFilter] = useState<string>("");
  const [pageSize, setPageSize] = useState(100);

  const orgs = useMemo(() => uniqueOrgs(events), [events]);
  const repos = useMemo(() => {
    const all = uniqueRepos(events);
    if (!orgFilter) return all;
    const prefix = `${orgFilter}/`.toLowerCase();
    return all.filter((r) => r.toLowerCase().startsWith(prefix));
  }, [events, orgFilter]);

  const filtered = useMemo(() => {
    const cutoff =
      dateRange === "all"
        ? null
        : subDays(
            new Date(),
            dateRange === "7d"
              ? 7
              : dateRange === "30d"
                ? 30
                : dateRange === "90d"
                  ? 90
                  : 365,
          );

    return events.filter((e) => {
      if (!enabledKinds.has(e.kind)) return false;
      if (scope === "external" && !e.isExternal) return false;
      if (scope === "own" && e.isExternal) return false;
      if (
        orgFilter &&
        e.ownerLogin.toLowerCase() !== orgFilter.toLowerCase()
      )
        return false;
      if (repoFilter && e.repo !== repoFilter) return false;
      if (cutoff && e.at.getTime() < cutoff.getTime()) return false;
      return true;
    });
  }, [events, scope, dateRange, enabledKinds, orgFilter, repoFilter]);

  const visible = filtered.slice(0, pageSize);

  function toggleKindGroup(group: EventKind[]) {
    setEnabledKinds((prev) => {
      const next = new Set(prev);
      const allOn = group.every((k) => next.has(k));
      if (allOn) {
        for (const k of group) next.delete(k);
      } else {
        for (const k of group) next.add(k);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPills
          value={scope}
          onChange={setScope}
          options={[
            { id: "all", label: "All" },
            { id: "external", label: "External only" },
            { id: "own", label: "Own only" },
          ]}
        />
        <FilterPills
          value={dateRange}
          onChange={setDateRange}
          options={[
            { id: "7d", label: "7d" },
            { id: "30d", label: "30d" },
            { id: "90d", label: "90d" },
            { id: "1y", label: "1y" },
            { id: "all", label: "All" },
          ]}
        />
        <select
          value={orgFilter}
          onChange={(e) => {
            setOrgFilter(e.target.value);
            setRepoFilter(""); // reset repo when org changes
          }}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          title="Filter by organization (repo owner)"
        >
          <option value="">Any org ({orgs.length})</option>
          {orgs.map((o) => (
            <option key={o.org} value={o.org}>
              {o.org} · {o.count}
            </option>
          ))}
        </select>
        <select
          value={repoFilter}
          onChange={(e) => setRepoFilter(e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">Any repo ({repos.length})</option>
          {repos.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-neutral-500">
          {filtered.length.toLocaleString()} event
          {filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      {orgs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Org
          </span>
          <button
            onClick={() => {
              setOrgFilter("");
              setRepoFilter("");
            }}
            className={clsx(
              "rounded-full border px-2.5 py-0.5 text-[11px] transition",
              orgFilter === ""
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400",
            )}
          >
            All
          </button>
          {orgs.slice(0, 12).map((o) => (
            <button
              key={o.org}
              onClick={() => {
                setOrgFilter(o.org);
                setRepoFilter("");
              }}
              className={clsx(
                "rounded-full border px-2.5 py-0.5 text-[11px] transition",
                orgFilter === o.org
                  ? "border-violet-500 bg-violet-500 text-white"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-violet-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
              )}
              title={`${o.count} events`}
            >
              <span className="font-mono">{o.org}</span>
              <span className="ml-1 text-[9px] opacity-70">{o.count}</span>
            </button>
          ))}
          {orgs.length > 12 ? (
            <span className="text-[10px] text-neutral-500">
              +{orgs.length - 12} more in dropdown
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {KIND_GROUPS.map((g) => {
          const active = g.id.every((k) => enabledKinds.has(k));
          return (
            <button
              key={g.label}
              onClick={() => toggleKindGroup(g.id)}
              className={clsx(
                "rounded-full border px-3 py-1 text-xs transition",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400",
              )}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm font-medium">No events match these filters</p>
          <p className="mt-1 text-xs text-neutral-500">
            Widen the date range or toggle more event types.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </ul>
      )}

      {visible.length < filtered.length ? (
        <div className="flex justify-center">
          <button
            onClick={() => setPageSize((s) => s + 100)}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-xs font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            Load 100 more ({filtered.length - visible.length} remaining)
          </button>
        </div>
      ) : null}
    </div>
  );
}

function EventCard({ event }: { event: TimelineEvent }) {
  const [open, setOpen] = useState(false);

  const meta = describe(event);
  const expandable =
    event.kind !== "REVIEW_COMMENT" || Boolean((event as { reviewComment?: { body?: string } }).reviewComment?.body);

  return (
    <li className="overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => expandable && setOpen((o) => !o)}
        className={clsx(
          "flex w-full items-baseline gap-3 px-4 py-3 text-left transition",
          expandable && "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
        )}
        disabled={!expandable}
      >
        <span
          className={clsx(
            "shrink-0 text-xs text-neutral-400 transition",
            open ? "rotate-90" : "",
            !expandable && "opacity-0",
          )}
        >
          ▶
        </span>
        <KindBadge kind={event.kind} />
        <span className="flex-1 truncate text-sm">
          {event.isExternal ? (
            <span className="mr-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
              ext
            </span>
          ) : null}
          {meta.title}
        </span>
        <span className="shrink-0 truncate font-mono text-[11px] text-neutral-500">
          {event.repo}
        </span>
        <span
          className="shrink-0 text-xs text-neutral-500"
          title={format(event.at, "yyyy-MM-dd HH:mm:ss")}
        >
          {formatDistanceToNowStrict(event.at)} ago
        </span>
      </button>
      {open ? <EventBody event={event} /> : null}
    </li>
  );
}

function EventBody({ event }: { event: TimelineEvent }) {
  switch (event.kind) {
    case "PR_OPENED":
    case "PR_MERGED":
    case "PR_CLOSED":
      return <PRDetail pr={event.pr} />;

    case "ISSUE_OPENED":
    case "ISSUE_CLOSED":
      return (
        <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="mb-3 flex flex-wrap gap-1">
            {event.issue.labels.map((l, i) => (
              <span
                key={i}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `#${l.color}33`, color: `#${l.color}` }}
              >
                {l.name}
              </span>
            ))}
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <MarkdownBody body={event.issue.body} />
          </div>
          {event.issue.comments.length > 0 ? (
            <div className="mt-3">
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {event.issue.comments.length} comment
                {event.issue.comments.length === 1 ? "" : "s"}
              </h5>
              <CommentList comments={event.issue.comments} />
            </div>
          ) : null}
          <div className="mt-2 text-right">
            <a
              href={event.issue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Open on GitHub ↗
            </a>
          </div>
        </div>
      );

    case "PR_COMMENT":
    case "ISSUE_COMMENT":
      return (
        <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="mb-2 text-xs text-neutral-500">
            {event.kind === "PR_COMMENT"
              ? `On PR ${event.pr.repo.nameWithOwner}#${event.pr.number} — ${event.pr.title}`
              : `On issue ${event.issue.repo.nameWithOwner}#${event.issue.number} — ${event.issue.title}`}
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <MarkdownBody body={event.comment.body} />
          </div>
          {event.kind === "PR_COMMENT" ? (
            <div className="mt-3">
              <PRJumpButton pr={event.pr} />
            </div>
          ) : null}
        </div>
      );

    case "REVIEW_GIVEN":
      return (
        <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="mb-2 text-xs text-neutral-500">
            Review on {event.pr.repo.nameWithOwner}#{event.pr.number} —{" "}
            {event.pr.title}
          </div>
          <ReviewList reviews={[event.review]} />
          <div className="mt-3">
            <PRJumpButton pr={event.pr} />
          </div>
        </div>
      );

    case "REVIEW_COMMENT":
      return (
        <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="mb-2 text-xs text-neutral-500">
            Review comment on {event.pr.repo.nameWithOwner}#{event.pr.number}
            {event.reviewComment.path ? (
              <>
                {" · "}
                <code className="font-mono">
                  {event.reviewComment.path}
                  {event.reviewComment.line ? `:${event.reviewComment.line}` : ""}
                </code>
              </>
            ) : null}
          </div>
          {event.reviewComment.diffHunk ? (
            <pre className="mb-2 max-h-40 overflow-auto rounded bg-neutral-100 p-2 font-mono text-[11px] dark:bg-neutral-800">
              {event.reviewComment.diffHunk}
            </pre>
          ) : null}
          <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <MarkdownBody body={event.reviewComment.body} />
          </div>
          <div className="mt-3">
            <PRJumpButton pr={event.pr} />
          </div>
        </div>
      );
  }
}

function PRJumpButton({ pr }: { pr: PRNode }) {
  // Resolve the current profile username from the URL so the button targets
  // the in-app PR view rather than github.com.
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  const m = /^\/u\/([^/]+)/.exec(pathname);
  const username = m?.[1] ?? pr.repo.ownerLogin;
  const [owner, repo] = pr.repo.nameWithOwner.split("/");
  return (
    <a
      href={`/u/${username}/pr/${owner}/${repo}/${pr.number}`}
      className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
    >
      View {pr.changedFiles} file change
      {pr.changedFiles === 1 ? "" : "s"} →
    </a>
  );
}

function describe(event: TimelineEvent): { title: string } {
  switch (event.kind) {
    case "PR_OPENED":
      return { title: `Opened: ${event.pr.title}` };
    case "PR_MERGED":
      return { title: `Merged: ${event.pr.title}` };
    case "PR_CLOSED":
      return { title: `Closed (unmerged): ${event.pr.title}` };
    case "ISSUE_OPENED":
      return { title: `Filed issue: ${event.issue.title}` };
    case "ISSUE_CLOSED":
      return { title: `Issue closed: ${event.issue.title}` };
    case "PR_COMMENT":
      return {
        title: `Commented on #${event.pr.number}: "${snippetOf(event.comment.body)}"`,
      };
    case "ISSUE_COMMENT":
      return {
        title: `Commented on #${event.issue.number}: "${snippetOf(event.comment.body)}"`,
      };
    case "REVIEW_GIVEN": {
      const verdict =
        event.review.state === "APPROVED"
          ? "approved"
          : event.review.state === "CHANGES_REQUESTED"
            ? "requested changes"
            : "commented";
      return { title: `Review (${verdict}) on #${event.pr.number}` };
    }
    case "REVIEW_COMMENT":
      return {
        title: `Review comment on #${event.pr.number}: "${snippetOf(event.reviewComment.body)}"`,
      };
  }
}

function snippetOf(text: string, max = 80): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

function KindBadge({ kind }: { kind: EventKind }) {
  const map: Record<EventKind, { label: string; cls: string }> = {
    PR_OPENED: {
      label: "PR Opened",
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    },
    PR_MERGED: {
      label: "PR Merged",
      cls: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
    },
    PR_CLOSED: {
      label: "PR Closed",
      cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    },
    ISSUE_OPENED: {
      label: "Issue",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    },
    ISSUE_CLOSED: {
      label: "Issue Closed",
      cls: "bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100",
    },
    PR_COMMENT: {
      label: "PR Comment",
      cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    },
    ISSUE_COMMENT: {
      label: "Issue Comment",
      cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    },
    REVIEW_GIVEN: {
      label: "Review",
      cls: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
    },
    REVIEW_COMMENT: {
      label: "Review Comment",
      cls: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
    },
  };
  const { label, cls } = map[kind];
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function FilterPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-md border border-neutral-300 bg-white p-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={clsx(
            "rounded px-3 py-1 transition",
            value === o.id
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

