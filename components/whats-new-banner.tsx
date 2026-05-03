"use client";

import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import type { WhatsNewSummary } from "@/lib/whats-new";

export function WhatsNewBanner({
  summary,
  since,
}: {
  summary: WhatsNewSummary;
  since: Date;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || summary.totalSignals === 0) return null;

  const parts: string[] = [];
  if (summary.newPRs.length)
    parts.push(`${summary.newPRs.length} new PR${summary.newPRs.length === 1 ? "" : "s"}`);
  if (summary.newIssues.length)
    parts.push(`${summary.newIssues.length} new issue${summary.newIssues.length === 1 ? "" : "s"}`);
  const newComments =
    summary.newPRComments.reduce((s, x) => s + x.comments.length, 0) +
    summary.newIssueComments.reduce((s, x) => s + x.comments.length, 0);
  if (newComments) parts.push(`${newComments} new comment${newComments === 1 ? "" : "s"}`);
  if (summary.newReviewActivity)
    parts.push(`${summary.newReviewActivity} review activit${summary.newReviewActivity === 1 ? "y" : "ies"}`);

  return (
    <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none">✨</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
            New since your last visit
          </div>
          <div className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
            {parts.join(" · ")}{" "}
            <span className="text-amber-700/70 dark:text-amber-300/70">
              · last visited {formatDistanceToNowStrict(since)} ago (
              {format(since, "MMM d, yyyy")})
            </span>
          </div>
          {summary.newPRs.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs">
              {summary.newPRs.slice(0, 5).map((pr) => (
                <li key={pr.number} className="flex items-baseline gap-2">
                  <span className="shrink-0 font-mono text-amber-700 dark:text-amber-300">
                    {pr.repo.nameWithOwner}#{pr.number}
                  </span>
                  <span className="truncate text-amber-900 dark:text-amber-100">
                    {pr.title}
                  </span>
                </li>
              ))}
              {summary.newPRs.length > 5 ? (
                <li className="text-amber-700 dark:text-amber-300">
                  …and {summary.newPRs.length - 5} more
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-700/70 hover:text-amber-900 dark:text-amber-300/70 dark:hover:text-amber-100"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
