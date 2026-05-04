"use client";

import clsx from "clsx";
import type { ContributionCalendar } from "@/types/github";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ContributionHeatmap({ calendar }: { calendar: ContributionCalendar }) {
  const max = calendar.weeks
    .flatMap((w) => w.days.map((d) => d.count))
    .reduce((m, n) => Math.max(m, n), 0);

  function level(count: number): number {
    if (count === 0) return 0;
    if (max === 0) return 0;
    const ratio = count / max;
    if (ratio < 0.15) return 1;
    if (ratio < 0.4) return 2;
    if (ratio < 0.7) return 3;
    return 4;
  }

  const levelCls = [
    "bg-neutral-200 dark:bg-neutral-800",
    "bg-emerald-200 dark:bg-emerald-900",
    "bg-emerald-400 dark:bg-emerald-700",
    "bg-emerald-600 dark:bg-emerald-500",
    "bg-emerald-700 dark:bg-emerald-300",
  ];

  // Compute month labels for axis: pick first column of each new month
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

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Contribution activity</h3>
        <span className="text-xs text-neutral-500">
          {calendar.totalContributions.toLocaleString()} contributions in the last year
        </span>
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
                  if (!d)
                    return (
                      <div key={dayIdx} className="h-[10px] w-[10px]" />
                    );
                  return (
                    <div
                      key={dayIdx}
                      title={`${d.date}: ${d.count} contributions`}
                      className={clsx(
                        "h-[10px] w-[10px] rounded-[2px]",
                        levelCls[level(d.count)],
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
        {levelCls.map((c, i) => (
          <span key={i} className={clsx("h-[10px] w-[10px] rounded-[2px]", c)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
