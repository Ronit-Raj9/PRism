"use client";

import type { ProfileBundle } from "@/types/github";
import type { TimelineEvent } from "@/lib/timeline";

interface Props {
  bundle: ProfileBundle;
  events: TimelineEvent[];
}

export function InsightsSidebar({ bundle, events }: Props) {
  const merged = bundle.pullRequests.filter((p) => p.state === "MERGED").length;
  const open = bundle.pullRequests.filter((p) => p.state === "OPEN").length;
  const closed = bundle.pullRequests.filter((p) => p.state === "CLOSED").length;
  const comments = events.filter(
    (e) => e.kind === "PR_COMMENT" || e.kind === "ISSUE_COMMENT",
  ).length;
  const reviews = events.filter(
    (e) => e.kind === "REVIEW_GIVEN" || e.kind === "REVIEW_COMMENT",
  ).length;

  return (
    <div className="space-y-3 p-3 text-xs">
      <div className="text-[11px] text-neutral-500">
        Click an insight tab to see full charts.
      </div>
      <Stat label="PRs merged" value={merged} />
      <Stat label="PRs open" value={open} />
      <Stat label="PRs closed" value={closed} />
      <Stat label="Issues filed" value={bundle.issues.length} />
      <Stat label="Comments" value={comments} />
      <Stat label="Reviews" value={reviews} />
      <Stat label="Followers" value={bundle.user.followers} />
      <Stat label="Public repos" value={bundle.user.publicRepos} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-neutral-200/50 pb-1 dark:border-neutral-800/50">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
        {value.toLocaleString()}
      </span>
    </div>
  );
}
