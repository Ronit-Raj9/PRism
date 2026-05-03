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

export function uniqueRepos(events: TimelineEvent[]): string[] {
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
export function uniqueOrgs(events: TimelineEvent[]): OrgTally[] {
  const map = new Map<string, number>();
  for (const e of events) {
    map.set(e.ownerLogin, (map.get(e.ownerLogin) ?? 0) + 1);
  }
  return Array.from(map, ([org, count]) => ({ org, count })).sort(
    (a, b) => b.count - a.count || a.org.localeCompare(b.org),
  );
}
