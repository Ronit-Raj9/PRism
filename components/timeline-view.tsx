"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { format, formatDistanceToNowStrict, parseISO, subDays } from "date-fns";
import type { ClientTimelineEvent, EventKind } from "@/lib/timeline";
import { uniqueOrgs, uniqueRepos } from "@/lib/timeline";
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
  events: ClientTimelineEvent[];
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
      if (cutoff && new Date(e.atIso).getTime() < cutoff.getTime())
        return false;
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

const EventCard = memo(function EventCard({ event }: { event: ClientTimelineEvent }) {
  const [open, setOpen] = useState(false);

  const at = useMemo(() => new Date(event.atIso), [event.atIso]);
  const expandable = event.expandable;

  // Date formatting is expensive when called for every visible row on every
  // re-render. Compute once per event lifetime.
  const ago = useMemo(() => `${formatDistanceToNowStrict(at)} ago`, [at]);
  const tipDate = useMemo(() => format(at, "yyyy-MM-dd HH:mm:ss"), [at]);

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
          {event.rowTitle}
        </span>
        <span className="shrink-0 truncate font-mono text-[11px] text-neutral-500">
          {event.repo}
        </span>
        <span
          className="shrink-0 text-xs text-neutral-500"
          title={tipDate}
        >
          {ago}
        </span>
      </button>
      {open ? <EventBody event={event} /> : null}
    </li>
  );
});

function EventBody({ event }: { event: ClientTimelineEvent }) {
  switch (event.kind) {
    case "PR_OPENED":
    case "PR_MERGED":
    case "PR_CLOSED":
      return (
        <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="mb-3 flex flex-wrap items-baseline gap-3 text-xs">
            <span className="font-mono text-neutral-500">
              {event.repo}#{event.prNumber}
            </span>
            {event.additions != null ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                +{event.additions.toLocaleString()}
              </span>
            ) : null}
            {event.deletions != null ? (
              <span className="text-rose-600 dark:text-rose-400">
                −{event.deletions.toLocaleString()}
              </span>
            ) : null}
            {event.changedFiles != null ? (
              <span className="text-neutral-500">
                {event.changedFiles} file{event.changedFiles === 1 ? "" : "s"}
                {event.mergedAt
                  ? ` · merged ${format(parseISO(event.mergedAt), "MMM d, yyyy")}`
                  : event.prCreatedAt
                    ? ` · opened ${format(parseISO(event.prCreatedAt), "MMM d, yyyy")}`
                    : null}
              </span>
            ) : null}
          </div>
          {event.bodyPreview ? (
            <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
              <MarkdownBody body={event.bodyPreview} />
            </div>
          ) : (
            <p className="text-sm italic text-neutral-500">No description.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {event.prOwner && event.prRepo && event.prNumber != null ? (
              <PRInAppLink
                prOwner={event.prOwner}
                prRepo={event.prRepo}
                prNumber={event.prNumber}
                changedFiles={event.changedFiles}
              />
            ) : null}
            {event.githubUrl ? (
              <a
                href={event.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                GitHub ↗
              </a>
            ) : null}
          </div>
        </div>
      );

    case "ISSUE_OPENED":
    case "ISSUE_CLOSED":
      return (
        <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          {event.labels && event.labels.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-1">
              {event.labels.map((l, i) => (
                <span
                  key={`${l.name}-${i}`}
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
          ) : null}
          <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <MarkdownBody body={event.bodyPreview ?? ""} />
          </div>
          {event.issueCommentCount != null && event.issueCommentCount > 0 ? (
            <p className="mt-3 text-xs text-neutral-500">
              {event.issueCommentCount} comment
              {event.issueCommentCount === 1 ? "" : "s"} on GitHub (not loaded
              here).
            </p>
          ) : null}
          <div className="mt-2 text-right">
            {event.githubUrl ? (
              <a
                href={event.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Open on GitHub ↗
              </a>
            ) : null}
          </div>
        </div>
      );

    case "PR_COMMENT":
    case "ISSUE_COMMENT":
      return (
        <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          {event.contextLine ? (
            <div className="mb-2 text-xs text-neutral-500">{event.contextLine}</div>
          ) : null}
          <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <MarkdownBody body={event.bodyPreview ?? ""} />
          </div>
          {event.kind === "PR_COMMENT" &&
          event.prOwner &&
          event.prRepo &&
          event.prNumber != null ? (
            <div className="mt-3">
              <PRInAppLink
                prOwner={event.prOwner}
                prRepo={event.prRepo}
                prNumber={event.prNumber}
                changedFiles={event.changedFiles}
              />
            </div>
          ) : null}
        </div>
      );

    case "REVIEW_GIVEN":
      return (
        <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          {event.contextLine ? (
            <div className="mb-2 text-xs text-neutral-500">{event.contextLine}</div>
          ) : null}
          {event.reviewState ? (
            <div className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
              State: {event.reviewState.replace(/_/g, " ")}
            </div>
          ) : null}
          <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <MarkdownBody body={event.bodyPreview ?? ""} />
          </div>
          <div className="mt-3">
            {event.prOwner && event.prRepo && event.prNumber != null ? (
              <PRInAppLink
                prOwner={event.prOwner}
                prRepo={event.prRepo}
                prNumber={event.prNumber}
                changedFiles={event.changedFiles}
              />
            ) : null}
          </div>
        </div>
      );

    case "REVIEW_COMMENT":
      return (
        <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="mb-2 text-xs text-neutral-500">
            Review comment on {event.repo}#{event.prNumber}
            {event.reviewPath ? (
              <>
                {" · "}
                <code className="font-mono">
                  {event.reviewPath}
                  {event.reviewLine != null ? `:${event.reviewLine}` : ""}
                </code>
              </>
            ) : null}
          </div>
          {event.diffHunkPreview ? (
            <pre className="mb-2 max-h-40 overflow-auto rounded bg-neutral-100 p-2 font-mono text-[11px] dark:bg-neutral-800">
              {event.diffHunkPreview}
            </pre>
          ) : null}
          <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <MarkdownBody body={event.bodyPreview ?? ""} />
          </div>
          <div className="mt-3">
            {event.prOwner && event.prRepo && event.prNumber != null ? (
              <PRInAppLink
                prOwner={event.prOwner}
                prRepo={event.prRepo}
                prNumber={event.prNumber}
                changedFiles={event.changedFiles}
              />
            ) : null}
          </div>
        </div>
      );
  }
}

function PRInAppLink({
  prOwner,
  prRepo,
  prNumber,
  changedFiles,
}: {
  prOwner: string;
  prRepo: string;
  prNumber: number;
  changedFiles?: number;
}) {
  const pathname = usePathname() ?? "";
  const m = /^\/u\/([^/]+)/.exec(pathname);
  const username = m?.[1] ?? prOwner;
  const cf = changedFiles ?? 0;
  return (
    <Link
      href={`/u/${encodeURIComponent(username)}/pr/${prOwner}/${prRepo}/${prNumber}`}
      className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
    >
      View {cf} file change{cf === 1 ? "" : "s"} →
    </Link>
  );
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

