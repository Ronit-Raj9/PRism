"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import type { TimelineEvent } from "@/lib/timeline";

interface Props {
  events: TimelineEvent[];
}

export function TimelineSidebar({ events }: Props) {
  const groups = useMemo(() => {
    const m = new Map<string, TimelineEvent[]>();
    for (const e of events.slice(0, 200)) {
      const key = format(e.at, "yyyy-MM");
      const arr = m.get(key) ?? [];
      arr.push(e);
      m.set(key, arr);
    }
    return Array.from(m.entries());
  }, [events]);

  return (
    <div className="py-1 text-xs">
      <div className="px-3 py-2 text-[11px] text-neutral-500">
        Recent activity. Open the Timeline tab for filters.
      </div>
      {groups.map(([month, list]) => (
        <div key={month}>
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            {format(new Date(`${month}-01`), "MMM yyyy")} · {list.length}
          </div>
          {list.slice(0, 12).map((e) => (
            <div
              key={e.id}
              className="px-3 py-1 text-neutral-700 dark:text-neutral-300"
              title={e.repo}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase text-neutral-500">
                  {kindShort(e.kind)}
                </span>
                <span className="flex-1 truncate">{titleOf(e)}</span>
              </div>
              <div className="truncate text-[10px] text-neutral-500">
                {e.repo}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function kindShort(kind: TimelineEvent["kind"]): string {
  switch (kind) {
    case "PR_OPENED":
      return "PR open";
    case "PR_MERGED":
      return "PR merged";
    case "PR_CLOSED":
      return "PR closed";
    case "ISSUE_OPENED":
      return "Issue";
    case "ISSUE_CLOSED":
      return "Iss closed";
    case "PR_COMMENT":
    case "ISSUE_COMMENT":
      return "Comment";
    case "REVIEW_GIVEN":
      return "Review";
    case "REVIEW_COMMENT":
      return "RC";
  }
}

function titleOf(e: TimelineEvent): string {
  if (e.kind === "PR_OPENED" || e.kind === "PR_MERGED" || e.kind === "PR_CLOSED")
    return e.pr.title;
  if (e.kind === "ISSUE_OPENED" || e.kind === "ISSUE_CLOSED") return e.issue.title;
  if (e.kind === "PR_COMMENT") return `on #${e.pr.number}`;
  if (e.kind === "ISSUE_COMMENT") return `on #${e.issue.number}`;
  if (e.kind === "REVIEW_GIVEN") return `review on #${e.pr.number}`;
  if (e.kind === "REVIEW_COMMENT") return `comment on #${e.pr.number}`;
  return "";
}
