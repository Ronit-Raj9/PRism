"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import type { TimelineEvent } from "@/lib/timeline";
import type { ContributionCalendar } from "@/types/github";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type LayerId =
  | "prs_opened"
  | "prs_merged"
  | "issues"
  | "reviews"
  | "comments"
  | "commits";

interface LayerDef {
  id: LayerId;
  label: string;
  /** Tailwind classes for level 0..4. */
  levels: [string, string, string, string, string];
  match: (e: TimelineEvent) => boolean;
}

const LAYERS: LayerDef[] = [
  {
    id: "prs_opened",
    label: "PRs Opened",
    levels: [
      "bg-neutral-200 dark:bg-neutral-800",
      "bg-emerald-200 dark:bg-emerald-900",
      "bg-emerald-400 dark:bg-emerald-700",
      "bg-emerald-600 dark:bg-emerald-500",
      "bg-emerald-700 dark:bg-emerald-300",
    ],
    match: (e) => e.kind === "PR_OPENED",
  },
  {
    id: "prs_merged",
    label: "PRs Merged",
    levels: [
      "bg-neutral-200 dark:bg-neutral-800",
      "bg-violet-200 dark:bg-violet-900",
      "bg-violet-400 dark:bg-violet-700",
      "bg-violet-600 dark:bg-violet-500",
      "bg-violet-700 dark:bg-violet-300",
    ],
    match: (e) => e.kind === "PR_MERGED",
  },
  {
    id: "issues",
    label: "Issues Filed",
    levels: [
      "bg-neutral-200 dark:bg-neutral-800",
      "bg-amber-200 dark:bg-amber-900",
      "bg-amber-400 dark:bg-amber-700",
      "bg-amber-600 dark:bg-amber-500",
      "bg-amber-700 dark:bg-amber-300",
    ],
    match: (e) => e.kind === "ISSUE_OPENED",
  },
  {
    id: "reviews",
    label: "Reviews",
    levels: [
      "bg-neutral-200 dark:bg-neutral-800",
      "bg-teal-200 dark:bg-teal-900",
      "bg-teal-400 dark:bg-teal-700",
      "bg-teal-600 dark:bg-teal-500",
      "bg-teal-700 dark:bg-teal-300",
    ],
    match: (e) => e.kind === "REVIEW_GIVEN" || e.kind === "REVIEW_COMMENT",
  },
  {
    id: "comments",
    label: "Comments",
    levels: [
      "bg-neutral-200 dark:bg-neutral-800",
      "bg-blue-200 dark:bg-blue-900",
      "bg-blue-400 dark:bg-blue-700",
      "bg-blue-600 dark:bg-blue-500",
      "bg-blue-700 dark:bg-blue-300",
    ],
    match: (e) => e.kind === "PR_COMMENT" || e.kind === "ISSUE_COMMENT",
  },
  {
    id: "commits",
    label: "Commits",
    levels: [
      "bg-neutral-200 dark:bg-neutral-800",
      "bg-neutral-300 dark:bg-neutral-700",
      "bg-neutral-400 dark:bg-neutral-600",
      "bg-neutral-500 dark:bg-neutral-500",
      "bg-neutral-700 dark:bg-neutral-300",
    ],
    // commits are not in our event stream — handled via calendar fallback
    match: () => false,
  },
];

interface Props {
  events: TimelineEvent[];
  calendar: ContributionCalendar;
}

export function MultiLayerHeatmap({ events, calendar }: Props) {
  const [active, setActive] = useState<LayerId>("prs_merged");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    if (active === "commits") {
      // Use GitHub's contribution calendar (commit-weighted) for the commits layer.
      for (const w of calendar.weeks) {
        for (const d of w.days) {
          map.set(d.date, d.count);
        }
      }
      return map;
    }
    const layer = LAYERS.find((l) => l.id === active)!;
    for (const e of events) {
      if (!layer.match(e)) continue;
      const date = e.at.toISOString().slice(0, 10);
      map.set(date, (map.get(date) ?? 0) + 1);
    }
    return map;
  }, [events, calendar, active]);

  const layer = LAYERS.find((l) => l.id === active)!;
  const max = useMemo(() => {
    let m = 0;
    for (const v of counts.values()) m = Math.max(m, v);
    return m;
  }, [counts]);

  function level(count: number): number {
    if (count === 0 || max === 0) return 0;
    const ratio = count / max;
    if (ratio < 0.15) return 1;
    if (ratio < 0.4) return 2;
    if (ratio < 0.7) return 3;
    return 4;
  }

  const monthLabels: { weekIndex: number; month: string }[] = [];
  let lastMonth = -1;
  calendar.weeks.forEach((w, i) => {
    const firstDay = w.days[0];
    if (!firstDay) return;
    const m = new Date(firstDay.date).getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ weekIndex: i, month: MONTHS[m] });
      lastMonth = m;
    }
  });

  const total = useMemo(
    () => Array.from(counts.values()).reduce((s, v) => s + v, 0),
    [counts],
  );

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Activity heatmap</h3>
        <span className="text-xs text-neutral-500">
          {total.toLocaleString()} {layer.label.toLowerCase()} in the last year
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            onClick={() => setActive(l.id)}
            className={clsx(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
              active === l.id
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="flex flex-col gap-1">
          <div className="flex gap-[3px] pl-7 text-[10px] text-neutral-500">
            {calendar.weeks.map((_, i) => {
              const label = monthLabels.find((m) => m.weekIndex === i);
              return (
                <div
                  key={i}
                  className="w-[10px] shrink-0 text-left"
                  style={{ minWidth: "10px" }}
                >
                  {label && i > 0 ? label.month : ""}
                </div>
              );
            })}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex w-6 flex-col gap-[3px] pt-[2px] text-[10px] text-neutral-500">
              <span style={{ height: 10 }} />
              <span style={{ height: 10 }}>Mon</span>
              <span style={{ height: 10 }} />
              <span style={{ height: 10 }}>Wed</span>
              <span style={{ height: 10 }} />
              <span style={{ height: 10 }}>Fri</span>
              <span style={{ height: 10 }} />
            </div>
            {calendar.weeks.map((w, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const d = w.days[dayIdx];
                  if (!d) return <div key={dayIdx} className="h-[10px] w-[10px]" />;
                  const c = counts.get(d.date) ?? 0;
                  return (
                    <div
                      key={dayIdx}
                      title={`${d.date}: ${c} ${layer.label.toLowerCase()}`}
                      className={clsx(
                        "h-[10px] w-[10px] rounded-[2px]",
                        layer.levels[level(c)],
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 text-[10px] text-neutral-500">
        <span>Less</span>
        {layer.levels.map((c, i) => (
          <span key={i} className={clsx("h-[10px] w-[10px] rounded-[2px]", c)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
