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

const MAX_CLIENT_BODY = 10_000;
const MAX_CLIENT_HUNK = 5_000;

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

export function toClientTimelineEvents(events: TimelineEvent[]): ClientTimelineEvent[] {
  return events.map((e) => {
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
  });
}
