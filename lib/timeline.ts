import { subDays } from "date-fns";
import type {
  ProfileBundle,
  PRNode,
  IssueNode,
  CommentNode,
  ReviewNode,
  ReviewCommentNode,
} from "@/types/github";

export type EventKind =
  | "PR_OPENED"
  | "PR_MERGED"
  | "PR_CLOSED"
  | "ISSUE_OPENED"
  | "ISSUE_CLOSED"
  | "PR_COMMENT"
  | "ISSUE_COMMENT"
  | "REVIEW_GIVEN"
  | "REVIEW_COMMENT";

export interface BaseEvent {
  id: string;
  kind: EventKind;
  at: Date;
  repo: string;
  ownerLogin: string;
  isExternal: boolean;
}

export interface PROpenedEvent extends BaseEvent {
  kind: "PR_OPENED" | "PR_MERGED" | "PR_CLOSED";
  pr: PRNode;
}

export interface IssueOpenedEvent extends BaseEvent {
  kind: "ISSUE_OPENED" | "ISSUE_CLOSED";
  issue: IssueNode;
}

export interface PRCommentEvent extends BaseEvent {
  kind: "PR_COMMENT";
  pr: PRNode;
  comment: CommentNode;
}

export interface IssueCommentEvent extends BaseEvent {
  kind: "ISSUE_COMMENT";
  issue: IssueNode;
  comment: CommentNode;
}

export interface ReviewGivenEvent extends BaseEvent {
  kind: "REVIEW_GIVEN";
  pr: PRNode;
  review: ReviewNode;
}

export interface ReviewCommentEvent extends BaseEvent {
  kind: "REVIEW_COMMENT";
  pr: PRNode;
  reviewComment: ReviewCommentNode;
}

export type TimelineEvent =
  | PROpenedEvent
  | IssueOpenedEvent
  | PRCommentEvent
  | IssueCommentEvent
  | ReviewGivenEvent
  | ReviewCommentEvent;

function isExternalRepo(ownerLogin: string, username: string): boolean {
  return ownerLogin.toLowerCase() !== username.toLowerCase();
}

/**
 * Flatten a ProfileBundle into a single chronological event stream.
 * Sorted descending (newest first) by event timestamp.
 *
 * Note: only events authored by the user appear here. We include reviews and
 * review comments left on the user's *own* PRs (i.e. by reviewers, not the
 * user) when they're authored by the profile user — the cached PR.reviews
 * data carries `authorLogin`, so we filter to the user themselves.
 *
 * Reviews the user gave on *other people's* PRs are not in our cache (would
 * need a separate `pullRequestReviewContributions` query) — deferred.
 */
export function buildTimeline(
  bundle: ProfileBundle,
  username: string,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const userLower = username.toLowerCase();

  for (const pr of bundle.pullRequests) {
    const isExternal = isExternalRepo(pr.repo.ownerLogin, username);

    events.push({
      id: `pr-open-${pr.repo.nameWithOwner}-${pr.number}`,
      kind: "PR_OPENED",
      at: new Date(pr.createdAt),
      repo: pr.repo.nameWithOwner,
      ownerLogin: pr.repo.ownerLogin,
      isExternal,
      pr,
    });

    if (pr.mergedAt) {
      events.push({
        id: `pr-merge-${pr.repo.nameWithOwner}-${pr.number}`,
        kind: "PR_MERGED",
        at: new Date(pr.mergedAt),
        repo: pr.repo.nameWithOwner,
        ownerLogin: pr.repo.ownerLogin,
        isExternal,
        pr,
      });
    } else if (pr.state === "CLOSED" && pr.closedAt) {
      events.push({
        id: `pr-close-${pr.repo.nameWithOwner}-${pr.number}`,
        kind: "PR_CLOSED",
        at: new Date(pr.closedAt),
        repo: pr.repo.nameWithOwner,
        ownerLogin: pr.repo.ownerLogin,
        isExternal,
        pr,
      });
    }

    for (const c of pr.comments) {
      // Only count comments authored by the user
      if (c.authorLogin?.toLowerCase() !== userLower) continue;
      events.push({
        id: `pr-comment-${pr.repo.nameWithOwner}-${pr.number}-${c.createdAt}`,
        kind: "PR_COMMENT",
        at: new Date(c.createdAt),
        repo: pr.repo.nameWithOwner,
        ownerLogin: pr.repo.ownerLogin,
        isExternal,
        pr,
        comment: c,
      });
    }

    for (const r of pr.reviews) {
      if (r.authorLogin?.toLowerCase() === userLower) {
        events.push({
          id: `pr-review-${pr.repo.nameWithOwner}-${pr.number}-${r.createdAt}`,
          kind: "REVIEW_GIVEN",
          at: new Date(r.createdAt),
          repo: pr.repo.nameWithOwner,
          ownerLogin: pr.repo.ownerLogin,
          isExternal,
          pr,
          review: r,
        });
      }
      for (const rc of r.comments) {
        if (rc.authorLogin?.toLowerCase() !== userLower) continue;
        events.push({
          id: `pr-rc-${pr.repo.nameWithOwner}-${pr.number}-${rc.createdAt}-${rc.path ?? ""}-${rc.line ?? ""}`,
          kind: "REVIEW_COMMENT",
          at: new Date(rc.createdAt),
          repo: pr.repo.nameWithOwner,
          ownerLogin: pr.repo.ownerLogin,
          isExternal,
          pr,
          reviewComment: rc,
        });
      }
    }
  }

  for (const issue of bundle.issues) {
    const isExternal = isExternalRepo(issue.repo.ownerLogin, username);
    events.push({
      id: `iss-open-${issue.repo.nameWithOwner}-${issue.number}`,
      kind: "ISSUE_OPENED",
      at: new Date(issue.createdAt),
      repo: issue.repo.nameWithOwner,
      ownerLogin: issue.repo.ownerLogin,
      isExternal,
      issue,
    });
    if (issue.closedAt) {
      events.push({
        id: `iss-close-${issue.repo.nameWithOwner}-${issue.number}`,
        kind: "ISSUE_CLOSED",
        at: new Date(issue.closedAt),
        repo: issue.repo.nameWithOwner,
        ownerLogin: issue.repo.ownerLogin,
        isExternal,
        issue,
      });
    }
    for (const c of issue.comments) {
      if (c.authorLogin?.toLowerCase() !== userLower) continue;
      events.push({
        id: `iss-comment-${issue.repo.nameWithOwner}-${issue.number}-${c.createdAt}`,
        kind: "ISSUE_COMMENT",
        at: new Date(c.createdAt),
        repo: issue.repo.nameWithOwner,
        ownerLogin: issue.repo.ownerLogin,
        isExternal,
        issue,
        comment: c,
      });
    }
  }

  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  return events;
}

/** Slim rows for filtering and counts — no bodies or nested payloads. */
export interface TimelineEventIndexItem {
  id: string;
  kind: EventKind;
  atIso: string;
  repo: string;
  ownerLogin: string;
  isExternal: boolean;
}

export function toTimelineEventIndex(events: readonly TimelineEvent[]): TimelineEventIndexItem[] {
  return events.map((e) => ({
    id: e.id,
    kind: e.kind,
    atIso: e.at.toISOString(),
    repo: e.repo,
    ownerLogin: e.ownerLogin,
    isExternal: e.isExternal,
  }));
}

export type TimelineScope = "all" | "external" | "own";
export type TimelineDateRange = "7d" | "30d" | "90d" | "1y" | "all";

export interface TimelineFilterParams {
  scope: TimelineScope;
  dateRange: TimelineDateRange;
  kinds: ReadonlySet<EventKind>;
  orgFilter: string;
  repoFilter: string;
}

function cutoffForDateRange(dateRange: TimelineDateRange): Date | null {
  if (dateRange === "all") return null;
  const days =
    dateRange === "7d"
      ? 7
      : dateRange === "30d"
        ? 30
        : dateRange === "90d"
          ? 90
          : 365;
  return subDays(new Date(), days);
}

/** Same filter semantics as the timeline UI — used client + API route. */
export function filterTimelineIndex(
  items: readonly TimelineEventIndexItem[],
  params: TimelineFilterParams,
): TimelineEventIndexItem[] {
  const cutoff = cutoffForDateRange(params.dateRange);
  const orgLower = params.orgFilter.trim().toLowerCase();
  const repoNeedle = params.repoFilter;

  return items.filter((e) => {
    if (!params.kinds.has(e.kind)) return false;
    if (params.scope === "external" && !e.isExternal) return false;
    if (params.scope === "own" && e.isExternal) return false;
    if (orgLower && e.ownerLogin.toLowerCase() !== orgLower) return false;
    if (repoNeedle && e.repo !== repoNeedle) return false;
    if (cutoff && new Date(e.atIso).getTime() < cutoff.getTime()) return false;
    return true;
  });
}

export function uniqueRepos(events: readonly { repo: string }[]): string[] {
  return Array.from(new Set(events.map((e) => e.repo))).sort();
}

export interface OrgTally {
  org: string;
  count: number;
}

/**
 * Organization tags derived from event ownerLogin values, sorted by event
 * count (most active first). Used for the timeline org filter.
 */
export function uniqueOrgs(events: readonly { ownerLogin: string }[]): OrgTally[] {
  const map = new Map<string, number>();
  for (const e of events) {
    map.set(e.ownerLogin, (map.get(e.ownerLogin) ?? 0) + 1);
  }
  return Array.from(map, ([org, count]) => ({ org, count })).sort(
    (a, b) => b.count - a.count || a.org.localeCompare(b.org),
  );
}

const MAX_CLIENT_BODY = 4_000;
const MAX_CLIENT_HUNK = 2_000;

function truncClient(s: string | null | undefined, max: number): string {
  if (s == null || s === "") return "";
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function parseOwnerRepo(nameWithOwner: string): { owner: string; repo: string } {
  const i = nameWithOwner.indexOf("/");
  if (i === -1) return { owner: nameWithOwner, repo: "" };
  return { owner: nameWithOwner.slice(0, i), repo: nameWithOwner.slice(i + 1) };
}

function snippetForRow(text: string, max = 80): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

/** Row title for list display (mirrors timeline-view `describe`). */
export function timelineRowTitle(e: TimelineEvent): string {
  switch (e.kind) {
    case "PR_OPENED":
      return `Opened: ${e.pr.title}`;
    case "PR_MERGED":
      return `Merged: ${e.pr.title}`;
    case "PR_CLOSED":
      return `Closed (unmerged): ${e.pr.title}`;
    case "ISSUE_OPENED":
      return `Filed issue: ${e.issue.title}`;
    case "ISSUE_CLOSED":
      return `Issue closed: ${e.issue.title}`;
    case "PR_COMMENT":
      return `Commented on #${e.pr.number}: "${snippetForRow(e.comment.body)}"`;
    case "ISSUE_COMMENT":
      return `Commented on #${e.issue.number}: "${snippetForRow(e.comment.body)}"`;
    case "REVIEW_GIVEN": {
      const verdict =
        e.review.state === "APPROVED"
          ? "approved"
          : e.review.state === "CHANGES_REQUESTED"
            ? "requested changes"
            : "commented";
      return `Review (${verdict}) on #${e.pr.number}`;
    }
    case "REVIEW_COMMENT":
      return `Review comment on #${e.pr.number}: "${snippetForRow(e.reviewComment.body)}"`;
  }
}

function timelineExpandable(e: TimelineEvent): boolean {
  if (e.kind !== "REVIEW_COMMENT") return true;
  return Boolean(e.reviewComment.body?.trim());
}

/**
 * JSON-safe timeline rows for the browser. Omits full PR/issue graphs (comments,
 * reviews, duplicate PR payloads) that previously duplicated megabytes per page.
 */
export interface ClientTimelineEvent {
  id: string;
  kind: EventKind;
  atIso: string;
  repo: string;
  ownerLogin: string;
  isExternal: boolean;
  rowTitle: string;
  expandable: boolean;
  prOwner?: string;
  prRepo?: string;
  prNumber?: number;
  githubUrl?: string;
  bodyPreview?: string;
  contextLine?: string;
  labels?: { name: string; color: string }[];
  diffHunkPreview?: string;
  reviewPath?: string | null;
  reviewLine?: number | null;
  reviewState?: ReviewNode["state"];
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  mergedAt?: string | null;
  prCreatedAt?: string;
  prClosedAt?: string | null;
  issueTitle?: string;
  issueNumber?: number;
  issueOwner?: string;
  issueRepo?: string;
  issueCommentCount?: number;
}

export function toClientTimelineEvent(e: TimelineEvent): ClientTimelineEvent {
  const base: ClientTimelineEvent = {
    id: e.id,
    kind: e.kind,
    atIso: e.at.toISOString(),
    repo: e.repo,
    ownerLogin: e.ownerLogin,
    isExternal: e.isExternal,
    rowTitle: timelineRowTitle(e),
    expandable: timelineExpandable(e),
  };

  switch (e.kind) {
    case "PR_OPENED":
    case "PR_MERGED":
    case "PR_CLOSED": {
      const { owner, repo } = parseOwnerRepo(e.pr.repo.nameWithOwner);
      return {
        ...base,
        prOwner: owner,
        prRepo: repo,
        prNumber: e.pr.number,
        githubUrl: e.pr.url,
        bodyPreview: truncClient(e.pr.body, MAX_CLIENT_BODY),
        additions: e.pr.additions,
        deletions: e.pr.deletions,
        changedFiles: e.pr.changedFiles,
        mergedAt: e.pr.mergedAt,
        prCreatedAt: e.pr.createdAt,
        prClosedAt: e.pr.closedAt,
      };
    }
    case "ISSUE_OPENED":
    case "ISSUE_CLOSED": {
      const { owner, repo } = parseOwnerRepo(e.issue.repo.nameWithOwner);
      return {
        ...base,
        issueOwner: owner,
        issueRepo: repo,
        issueNumber: e.issue.number,
        issueTitle: e.issue.title,
        githubUrl: e.issue.url,
        labels: e.issue.labels,
        bodyPreview: truncClient(e.issue.body, MAX_CLIENT_BODY),
        issueCommentCount: e.issue.comments.length,
      };
    }
    case "PR_COMMENT": {
      const { owner, repo } = parseOwnerRepo(e.pr.repo.nameWithOwner);
      return {
        ...base,
        prOwner: owner,
        prRepo: repo,
        prNumber: e.pr.number,
        githubUrl: e.pr.url,
        changedFiles: e.pr.changedFiles,
        contextLine: `On PR ${e.pr.repo.nameWithOwner}#${e.pr.number} — ${e.pr.title}`,
        bodyPreview: truncClient(e.comment.body, MAX_CLIENT_BODY),
      };
    }
    case "ISSUE_COMMENT": {
      const { owner, repo } = parseOwnerRepo(e.issue.repo.nameWithOwner);
      return {
        ...base,
        issueOwner: owner,
        issueRepo: repo,
        issueNumber: e.issue.number,
        githubUrl: e.issue.url,
        contextLine: `On issue ${e.issue.repo.nameWithOwner}#${e.issue.number} — ${e.issue.title}`,
        bodyPreview: truncClient(e.comment.body, MAX_CLIENT_BODY),
      };
    }
    case "REVIEW_GIVEN": {
      const { owner, repo } = parseOwnerRepo(e.pr.repo.nameWithOwner);
      return {
        ...base,
        prOwner: owner,
        prRepo: repo,
        prNumber: e.pr.number,
        githubUrl: e.pr.url,
        changedFiles: e.pr.changedFiles,
        contextLine: `Review on ${e.pr.repo.nameWithOwner}#${e.pr.number} — ${e.pr.title}`,
        reviewState: e.review.state,
        bodyPreview: truncClient(e.review.body, MAX_CLIENT_BODY),
      };
    }
    case "REVIEW_COMMENT": {
      const { owner, repo } = parseOwnerRepo(e.pr.repo.nameWithOwner);
      return {
        ...base,
        prOwner: owner,
        prRepo: repo,
        prNumber: e.pr.number,
        githubUrl: e.pr.url,
        changedFiles: e.pr.changedFiles,
        reviewPath: e.reviewComment.path,
        reviewLine: e.reviewComment.line,
        diffHunkPreview: truncClient(e.reviewComment.diffHunk, MAX_CLIENT_HUNK),
        bodyPreview: truncClient(e.reviewComment.body, MAX_CLIENT_BODY),
      };
    }
  }
}

export function toClientTimelineEvents(events: TimelineEvent[]): ClientTimelineEvent[] {
  return events.map(toClientTimelineEvent);
}

// Defensive re-truncate. If a stale cache hands the client a row whose
// `bodyPreview` / `diffHunkPreview` predates the current MAX_CLIENT_* caps,
// applying this on the way into render keeps the renderer out of OOM range.
export function clampClientTimelineEvent(e: ClientTimelineEvent): ClientTimelineEvent {
  const body =
    e.bodyPreview && e.bodyPreview.length > MAX_CLIENT_BODY
      ? `${e.bodyPreview.slice(0, MAX_CLIENT_BODY)}…`
      : e.bodyPreview;
  const hunk =
    e.diffHunkPreview && e.diffHunkPreview.length > MAX_CLIENT_HUNK
      ? `${e.diffHunkPreview.slice(0, MAX_CLIENT_HUNK)}…`
      : e.diffHunkPreview;
  if (body === e.bodyPreview && hunk === e.diffHunkPreview) return e;
  return { ...e, bodyPreview: body, diffHunkPreview: hunk };
}

/** All event kinds the timeline UI can toggle — default “everything on”. */
export const ALL_TIMELINE_EVENT_KINDS: readonly EventKind[] = [
  "PR_OPENED",
  "PR_MERGED",
  "PR_CLOSED",
  "ISSUE_OPENED",
  "ISSUE_CLOSED",
  "PR_COMMENT",
  "ISSUE_COMMENT",
  "REVIEW_GIVEN",
  "REVIEW_COMMENT",
] as const;

export function kindsSetFromCommaParam(kindsParam: string | null): Set<EventKind> {
  if (kindsParam == null || kindsParam.trim() === "") {
    return new Set(ALL_TIMELINE_EVENT_KINDS);
  }
  const allowed = new Set<string>(ALL_TIMELINE_EVENT_KINDS);
  const next = new Set<EventKind>();
  for (const part of kindsParam.split(",")) {
    const k = part.trim() as EventKind;
    if (allowed.has(k)) next.add(k);
  }
  return next.size > 0 ? next : new Set(ALL_TIMELINE_EVENT_KINDS);
}

export function timelineFilterParamsToSearchParams(
  p: TimelineFilterParams,
): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("scope", p.scope);
  sp.set("dateRange", p.dateRange);
  if (p.orgFilter.trim()) sp.set("org", p.orgFilter.trim());
  if (p.repoFilter) sp.set("repo", p.repoFilter);
  const kindsArr = [...p.kinds].sort() as string[];
  const allOn = kindsArr.length === ALL_TIMELINE_EVENT_KINDS.length;
  if (!allOn) sp.set("kinds", kindsArr.join(","));
  return sp;
}

export function serializeTimelineFilters(p: TimelineFilterParams): string {
  return JSON.stringify({
    scope: p.scope,
    dateRange: p.dateRange,
    orgFilter: p.orgFilter,
    repoFilter: p.repoFilter,
    kinds: [...p.kinds].sort(),
  });
}

export function parseTimelineFiltersFromSearchParams(
  sp: URLSearchParams,
): TimelineFilterParams {
  const scopeRaw = sp.get("scope");
  const scope: TimelineScope =
    scopeRaw === "external" || scopeRaw === "own" ? scopeRaw : "all";

  const dr = sp.get("dateRange");
  const dateRange: TimelineDateRange =
    dr === "7d" || dr === "30d" || dr === "90d" || dr === "1y" || dr === "all" ? dr : "90d";

  return {
    scope,
    dateRange,
    kinds: kindsSetFromCommaParam(sp.get("kinds")),
    orgFilter: sp.get("org") ?? "",
    repoFilter: sp.get("repo") ?? "",
  };
}

export function defaultTimelineFilterParams(): TimelineFilterParams {
  return {
    scope: "all",
    dateRange: "90d",
    kinds: new Set(ALL_TIMELINE_EVENT_KINDS),
    orgFilter: "",
    repoFilter: "",
  };
}

/** First timeline paint on `/timeline` — matches `defaultTimelineFilterParams`. */
export const TIMELINE_INITIAL_LIMIT = 120;

/**
 * Build slim index + filtered client rows for [offset, offset+limit).
 * Caller supplies the profile bundle (e.g. from cache).
 */
export function buildTimelinePaged(
  bundle: ProfileBundle,
  username: string,
  params: TimelineFilterParams,
  offset: number,
  limit: number,
): {
  index: TimelineEventIndexItem[];
  rows: ClientTimelineEvent[];
  total: number;
} {
  const events = buildTimeline(bundle, username);
  const index = toTimelineEventIndex(events);
  const filtered = filterTimelineIndex(index, params);
  const byId = new Map(events.map((e) => [e.id, e]));
  const window = filtered.slice(offset, offset + limit);
  const rows = window.map((item) => {
    const ev = byId.get(item.id);
    if (!ev) throw new Error(`Missing timeline event for id ${item.id}`);
    return toClientTimelineEvent(ev);
  });
  return { index, rows, total: filtered.length };
}
