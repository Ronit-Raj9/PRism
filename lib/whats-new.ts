import type { ProfileBundle, PRNode, IssueNode, CommentNode } from "@/types/github";

export interface WhatsNewSummary {
  newPRs: PRNode[];
  newIssues: IssueNode[];
  newPRComments: { pr: PRNode; comments: CommentNode[] }[];
  newIssueComments: { issue: IssueNode; comments: CommentNode[] }[];
  newReviewActivity: number;
  totalSignals: number;
}

function isAfter(iso: string | null | undefined, since: Date): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() > since.getTime();
}

/**
 * Compute new activity in `bundle` since `since`. Includes:
 * - PRs created OR merged after `since`
 * - Issues created OR closed after `since`
 * - PR comments added after `since` (on any PR)
 * - Issue comments added after `since` (on any issue)
 * - Review comments / reviews added after `since` (counted as a single signal)
 */
export function computeWhatsNew(bundle: ProfileBundle, since: Date): WhatsNewSummary {
  const newPRs: PRNode[] = [];
  const newPRComments: WhatsNewSummary["newPRComments"] = [];
  let newReviewActivity = 0;

  for (const pr of bundle.pullRequests) {
    const isNew = isAfter(pr.createdAt, since) || isAfter(pr.mergedAt, since);
    if (isNew) newPRs.push(pr);

    const newComments = pr.comments.filter((c) => isAfter(c.createdAt, since));
    if (newComments.length > 0 && !isNew) {
      newPRComments.push({ pr, comments: newComments });
    }

    for (const r of pr.reviews) {
      if (isAfter(r.createdAt, since)) newReviewActivity++;
      for (const rc of r.comments) {
        if (isAfter(rc.createdAt, since)) newReviewActivity++;
      }
    }
  }

  const newIssues: IssueNode[] = [];
  const newIssueComments: WhatsNewSummary["newIssueComments"] = [];

  for (const issue of bundle.issues) {
    const isNew = isAfter(issue.createdAt, since) || isAfter(issue.closedAt, since);
    if (isNew) newIssues.push(issue);
    const newComments = issue.comments.filter((c) => isAfter(c.createdAt, since));
    if (newComments.length > 0 && !isNew) {
      newIssueComments.push({ issue, comments: newComments });
    }
  }

  const totalSignals =
    newPRs.length +
    newIssues.length +
    newPRComments.reduce((s, x) => s + x.comments.length, 0) +
    newIssueComments.reduce((s, x) => s + x.comments.length, 0) +
    newReviewActivity;

  return {
    newPRs,
    newIssues,
    newPRComments,
    newIssueComments,
    newReviewActivity,
    totalSignals,
  };
}
