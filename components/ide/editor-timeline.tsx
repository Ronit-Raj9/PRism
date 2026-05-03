"use client";

import type { TimelineEvent } from "@/lib/timeline";
import type { PRNode, IssueNode } from "@/types/github";
import { TimelineView } from "@/components/timeline-view";

interface Props {
  events: TimelineEvent[];
  onOpenPR?: (pr: PRNode) => void;
  onOpenIssue?: (issue: IssueNode) => void;
}

export function EditorTimeline({ events }: Props) {
  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <h1 className="mb-4 text-lg font-semibold">Timeline</h1>
      <TimelineView events={events} />
    </div>
  );
}
