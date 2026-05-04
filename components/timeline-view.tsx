"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Component, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import type {
  ClientTimelineEvent,
  EventKind,
  TimelineDateRange,
  TimelineEventIndexItem,
  TimelineFilterParams,
  TimelineScope,
} from "@/lib/timeline";
import {
  clampClientTimelineEvent,
  filterTimelineIndex,
  serializeTimelineFilters,
  timelineFilterParamsToSearchParams,
  uniqueOrgs,
  uniqueRepos,
} from "@/lib/timeline";
import { MarkdownBody } from "./markdown-body";

const PAGE_FETCH = 100;

const KIND_GROUPS: { id: EventKind[]; label: string }[] = [
  { id: ["PR_OPENED", "PR_MERGED", "PR_CLOSED"], label: "PRs" },
  { id: ["ISSUE_OPENED", "ISSUE_CLOSED"], label: "Issues" },
  { id: ["PR_COMMENT", "ISSUE_COMMENT"], label: "Comments" },
  { id: ["REVIEW_GIVEN", "REVIEW_COMMENT"], label: "Reviews" },
];

interface Props {
  username: string;
  eventIndex: TimelineEventIndexItem[];
  initialRows: ClientTimelineEvent[];
  initialFilterKey: string;
}

export function TimelineView({
  username,
  eventIndex,
  initialRows,
  initialFilterKey,
}: Props) {
  const [scope, setScope] = useState<TimelineScope>("all");
  const [dateRange, setDateRange] = useState<TimelineDateRange>("90d");
  const [enabledKinds, setEnabledKinds] = useState<Set<EventKind>>(
    () => new Set(KIND_GROUPS.flatMap((g) => g.id)),
  );
  const [orgFilter, setOrgFilter] = useState<string>("");
  const [repoFilter, setRepoFilter] = useState<string>("");
  const [rows, setRows] = useState<ClientTimelineEvent[]>(() =>
    initialRows.map(clampClientTimelineEvent),
  );
  const [listRefreshing, setListRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const listParentRef = useRef<HTMLDivElement>(null);

  const filterParams = useMemo<TimelineFilterParams>(
    () => ({
      scope,
      dateRange,
      kinds: enabledKinds,
      orgFilter,
      repoFilter,
    }),
    [scope, dateRange, enabledKinds, orgFilter, repoFilter],
  );

  const filterSerialized = useMemo(
    () => serializeTimelineFilters(filterParams),
    [filterParams],
  );

  const filteredIndex = useMemo(
    () => filterTimelineIndex(eventIndex, filterParams),
    [eventIndex, filterParams],
  );

  const totalMatching = filteredIndex.length;

  const orgs = useMemo(() => uniqueOrgs(eventIndex), [eventIndex]);
  const repos = useMemo(() => {
    const all = uniqueRepos(eventIndex);
    if (!orgFilter) return all;
    const prefix = `${orgFilter}/`.toLowerCase();
    return all.filter((r) => r.toLowerCase().startsWith(prefix));
  }, [eventIndex, orgFilter]);

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function refreshList() {
      setListError(null);
      if (enabledKinds.size === 0) {
        if (!alive) return;
        setRows([]);
        setListRefreshing(false);
        return;
      }

      if (filterSerialized === initialFilterKey) {
        if (!alive) return;
        setRows(initialRows.map(clampClientTimelineEvent));
        setListRefreshing(false);
        return;
      }

      if (filteredIndex.length === 0) {
        if (!alive) return;
        setRows([]);
        setListRefreshing(false);
        return;
      }

      setListRefreshing(true);
      setRows([]);
      try {
        const sp = timelineFilterParamsToSearchParams(filterParams);
        sp.set("offset", "0");
        sp.set("limit", String(PAGE_FETCH));
        const res = await fetch(
          `/api/u/${encodeURIComponent(username)}/timeline/rows?${sp}`,
          { signal: ac.signal },
        );
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Profile not found" : `Request failed (${res.status})`);
        }
        const data = (await res.json()) as { rows: ClientTimelineEvent[] };
        if (!alive) return;
        setRows(data.rows.map(clampClientTimelineEvent));
      } catch (e) {
        if (!alive || (e instanceof DOMException && e.name === "AbortError")) return;
        setListError(e instanceof Error ? e.message : "Could not load timeline");
        setRows([]);
      } finally {
        if (alive) setListRefreshing(false);
      }
    }

    void refreshList();
    return () => {
      alive = false;
      ac.abort();
    };
  }, [
    enabledKinds.size,
    filterSerialized,
    filteredIndex.length,
    initialFilterKey,
    initialRows,
    username,
    filterParams,
  ]);

  // TanStack Virtual opts out of React Compiler memoization by design.
  // eslint-disable-next-line react-hooks/incompatible-library -- windowed list
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 112,
    overscan: 10,
  });

  const loadMore = useCallback(async () => {
    if (enabledKinds.size === 0 || rows.length >= totalMatching || loadingMore || listRefreshing) return;
    setLoadingMore(true);
    setListError(null);
    try {
      const sp = timelineFilterParamsToSearchParams(filterParams);
      sp.set("offset", String(rows.length));
      sp.set("limit", String(PAGE_FETCH));
      const res = await fetch(`/api/u/${encodeURIComponent(username)}/timeline/rows?${sp}`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Profile not found" : `Request failed (${res.status})`);
      }
      const data = (await res.json()) as { rows: ClientTimelineEvent[] };
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const next = [...prev];
        for (const r of data.rows) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            next.push(clampClientTimelineEvent(r));
          }
        }
        return next;
      });
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not load more");
    } finally {
      setLoadingMore(false);
    }
  }, [
    enabledKinds.size,
    filterParams,
    listRefreshing,
    loadingMore,
    rows.length,
    totalMatching,
    username,
  ]);

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
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <section className="ui-panel shrink-0 rounded-lg border border-[var(--border)] p-2 sm:p-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-2">
          <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterPills
                value={scope}
                onChange={setScope}
                options={[
                  { id: "all", label: "All" },
                  { id: "external", label: "External" },
                  { id: "own", label: "Own" },
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
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:gap-2.5">
              <label className="flex min-w-[8.5rem] max-w-[14rem] flex-1 flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  Org
                </span>
                <select
                  value={orgFilter}
                  onChange={(e) => {
                    setOrgFilter(e.target.value);
                    setRepoFilter("");
                  }}
                  className="ui-select h-8 py-1 text-xs"
                  title="Filter by organization"
                >
                  <option value="">Any org ({orgs.length})</option>
                  {orgs.map((o) => (
                    <option key={o.org} value={o.org}>
                      {o.org} ({o.count})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[8.5rem] max-w-[18rem] flex-1 flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  Repo
                </span>
                <select
                  value={repoFilter}
                  onChange={(e) => setRepoFilter(e.target.value)}
                  className="ui-select h-8 py-1 text-xs"
                  title="Filter by repository"
                >
                  <option value="">Any repo ({repos.length})</option>
                  {repos.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                Types
              </span>
              {KIND_GROUPS.map((g) => {
                const active = g.id.every((k) => enabledKinds.has(k));
                return (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() => toggleKindGroup(g.id)}
                    className={clsx(
                      "rounded-md px-2 py-1 text-[11px] font-medium transition sm:px-2.5",
                      active
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="shrink-0 whitespace-nowrap rounded-md bg-[var(--surface-2)] px-2 py-1 text-center text-xs tabular-nums text-[var(--muted)] sm:px-2.5 sm:text-sm">
            <span className="font-semibold text-[var(--foreground)]">
              {totalMatching.toLocaleString()}
            </span>{" "}
            <span className="hidden sm:inline">matching</span>
            <span className="sm:hidden">match</span>
          </p>
        </div>
      </section>

      {listError ? (
        <div className="ui-panel shrink-0 border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-800 dark:text-rose-200">
          {listError}
        </div>
      ) : null}

      {enabledKinds.size === 0 ? (
        <div className="ui-panel shrink-0 p-8 text-center sm:p-10">
          <p className="text-sm font-medium text-[var(--foreground)]">No event types selected</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted)]">
            Turn at least one group (PRs, Issues, …) back on to see activity.
          </p>
        </div>
      ) : totalMatching === 0 && !listRefreshing ? (
        <div className="ui-panel shrink-0 p-8 text-center sm:p-10">
          <p className="text-sm font-medium text-[var(--foreground)]">Nothing matches</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted)]">
            Try a wider time range, pick another organization, or turn event types back on.
          </p>
        </div>
      ) : listRefreshing && rows.length === 0 ? (
        <div className="ui-panel shrink-0 p-8 text-center text-sm text-[var(--muted)] sm:p-10">
          Loading events…
        </div>
      ) : (
        <div
          ref={listParentRef}
          className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] scrollbar-thin"
          role="list"
        >
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const e = rows[vi.index];
              if (!e) return null;
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full border-b border-[var(--border)]"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  <EventCard event={e} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rows.length < totalMatching && totalMatching > 0 && enabledKinds.size > 0 ? (
        <div className="flex shrink-0 justify-center pt-1">
          <button
            type="button"
            disabled={loadingMore || listRefreshing}
            onClick={() => void loadMore()}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore
              ? "Loading…"
              : `Load more · ${(totalMatching - rows.length).toLocaleString()} left`}
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

  const rowInner = (
    <>
      <span
        className={clsx(
          "mt-0.5 flex h-8 w-5 shrink-0 items-center justify-center text-[var(--muted)]",
          expandable ? "" : "opacity-0",
        )}
        aria-hidden
      >
        {expandable ? (
          open ? (
            <ChevronDown size={16} strokeWidth={2} className="shrink-0" />
          ) : (
            <ChevronRight size={16} strokeWidth={2} className="shrink-0" />
          )
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 gap-y-1.5">
          <KindBadge kind={event.kind} />
          {event.isExternal ? (
            <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
              External
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-[15px] font-medium leading-snug text-[var(--foreground)] sm:text-base">
          {event.rowTitle}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
          <span className="font-mono">{event.repo}</span>
          <span title={tipDate}>{ago}</span>
        </div>
      </div>
    </>
  );

  return (
    <div role="listitem" className="bg-[var(--surface)]">
      {expandable ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Collapse event details" : "Expand event details"}
          className="flex w-full cursor-pointer items-start gap-2 px-1 py-3 text-left transition hover:bg-[var(--surface-2)]/60 sm:gap-3 sm:px-2 sm:py-3.5"
        >
          {rowInner}
        </button>
      ) : (
        <div className="flex w-full items-start gap-2 px-1 py-3 text-left sm:gap-3 sm:px-2 sm:py-3.5">
          {rowInner}
        </div>
      )}
      {open && expandable ? (
        <RowErrorBoundary>
          <EventBody event={event} />
        </RowErrorBoundary>
      ) : null}
    </div>
  );
});

function EventBody({ event }: { event: ClientTimelineEvent }) {
  switch (event.kind) {
    case "PR_OPENED":
    case "PR_MERGED":
    case "PR_CLOSED":
      return (
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/40 px-1 pb-5 pt-4 sm:px-2">
          <div className="mb-3 flex flex-wrap items-baseline gap-3 text-xs">
            <span className="font-mono text-[var(--muted)]">
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
              <span className="text-[var(--muted)]">
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
            <div className="ui-panel p-4">
              <MarkdownBody body={event.bodyPreview} />
            </div>
          ) : (
            <p className="text-sm italic text-[var(--muted)]">No description.</p>
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
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
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/40 px-1 pb-5 pt-4 sm:px-2">
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
          <div className="ui-panel p-4">
            <MarkdownBody body={event.bodyPreview ?? ""} />
          </div>
          {event.issueCommentCount != null && event.issueCommentCount > 0 ? (
            <p className="mt-3 text-xs text-[var(--muted)]">
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
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
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
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/40 px-1 pb-5 pt-4 sm:px-2">
          {event.contextLine ? (
            <div className="mb-2 text-xs text-[var(--muted)]">{event.contextLine}</div>
          ) : null}
          <div className="ui-panel p-4">
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
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/40 px-1 pb-5 pt-4 sm:px-2">
          {event.contextLine ? (
            <div className="mb-2 text-xs text-[var(--muted)]">{event.contextLine}</div>
          ) : null}
          {event.reviewState ? (
            <div className="mb-2 text-xs font-medium text-[var(--muted)]">
              State: {event.reviewState.replace(/_/g, " ")}
            </div>
          ) : null}
          <div className="ui-panel p-4">
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
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/40 px-1 pb-5 pt-4 sm:px-2">
          <div className="mb-2 text-xs text-[var(--muted)]">
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
            <pre className="mb-2 max-h-40 overflow-auto rounded-lg bg-[var(--surface-2)] p-2 font-mono text-[11px]">
              {event.diffHunkPreview}
            </pre>
          ) : null}
          <div className="ui-panel p-4">
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
      // Auto-prefetch in Next 16 fetches the entire RSC payload for the PR
      // route — `getProfileBundleCached(username)` plus the full PRNode (all
      // comments, reviews, files). For a heavy profile that's multi-MB per
      // expanded row and accumulates in the router cache. Pay the cost on
      // click instead.
      prefetch={false}
      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      View {cf} file change{cf === 1 ? "" : "s"} →
    </Link>
  );
}

const KIND_BADGE_MAP: Record<EventKind, { label: string; cls: string }> = {
  PR_OPENED: {
    label: "Opened",
    cls: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  },
  PR_MERGED: {
    label: "Merged",
    cls: "bg-violet-500/12 text-violet-800 dark:text-violet-300",
  },
  PR_CLOSED: {
    label: "Closed",
    cls: "bg-rose-500/12 text-rose-800 dark:text-rose-300",
  },
  ISSUE_OPENED: {
    label: "Issue",
    cls: "bg-amber-500/12 text-amber-900 dark:text-amber-200",
  },
  ISSUE_CLOSED: {
    label: "Issue closed",
    cls: "bg-amber-500/18 text-amber-950 dark:text-amber-100",
  },
  PR_COMMENT: {
    label: "PR comment",
    cls: "bg-sky-500/12 text-sky-900 dark:text-sky-300",
  },
  ISSUE_COMMENT: {
    label: "Issue comment",
    cls: "bg-sky-500/12 text-sky-900 dark:text-sky-300",
  },
  REVIEW_GIVEN: {
    label: "Review",
    cls: "bg-teal-500/12 text-teal-900 dark:text-teal-300",
  },
  REVIEW_COMMENT: {
    label: "Inline review",
    cls: "bg-teal-500/12 text-teal-900 dark:text-teal-300",
  },
};

function KindBadge({ kind }: { kind: EventKind }) {
  const { label, cls } = KIND_BADGE_MAP[kind];
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

// Per-row error boundary. If anything in the expansion subtree throws (bad
// markdown, malformed event, …), we contain the failure to that row instead
// of letting it bubble through the route-level boundary and replace the
// whole timeline with an error screen.
class RowErrorBoundary extends Component<
  { children: ReactNode },
  { err: Error | null }
> {
  state: { err: Error | null } = { err: null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <div className="border-t border-rose-500/30 bg-rose-500/5 px-2 py-3 text-xs text-rose-700 dark:text-rose-300">
          Could not render this event ({this.state.err.message}).
        </div>
      );
    }
    return this.props.children;
  }
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
    <div className="inline-flex gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-[11px]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={clsx(
            "rounded-full px-2 py-1 font-medium transition sm:px-2.5",
            value === o.id
              ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

