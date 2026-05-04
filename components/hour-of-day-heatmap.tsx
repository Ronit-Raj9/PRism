"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { TimelineEvent } from "@/lib/timeline";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type TZ = "local" | "utc";

export function HourOfDayHeatmap({ events }: { events: TimelineEvent[] }) {
  const [tz, setTz] = useState<TZ>("local");

  const grid = useMemo(() => {
    // 7 days × 24 hours
    const m: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const e of events) {
      const d = e.at;
      const day = tz === "local" ? d.getDay() : d.getUTCDay();
      const hour = tz === "local" ? d.getHours() : d.getUTCHours();
      m[day][hour]++;
    }
    return m;
  }, [events, tz]);

  const max = useMemo(() => {
    let m = 0;
    for (const row of grid) for (const v of row) if (v > m) m = v;
    return m;
  }, [grid]);

  // Compute split: weekend pct, work-hours pct
  const stats = useMemo(() => {
    let total = 0;
    let weekend = 0;
    let nightOwl = 0; // 22:00–05:59
    let workingHours = 0; // 9–18 weekdays
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const v = grid[day][hour];
        total += v;
        if (day === 0 || day === 6) weekend += v;
        if (hour >= 22 || hour < 6) nightOwl += v;
        if (day >= 1 && day <= 5 && hour >= 9 && hour < 18) workingHours += v;
      }
    }
    return { total, weekend, nightOwl, workingHours };
  }, [grid]);

  function level(v: number): number {
    if (v === 0 || max === 0) return 0;
    const ratio = v / max;
    if (ratio < 0.15) return 1;
    if (ratio < 0.4) return 2;
    if (ratio < 0.7) return 3;
    return 4;
  }

  const levelCls = [
    "bg-neutral-200 dark:bg-neutral-800",
    "bg-indigo-200 dark:bg-indigo-900",
    "bg-indigo-400 dark:bg-indigo-700",
    "bg-indigo-600 dark:bg-indigo-500",
    "bg-indigo-700 dark:bg-indigo-300",
  ];

  if (stats.total === 0) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-sm font-semibold">When they work</h3>
        <p className="mt-2 text-sm text-neutral-500">
          Not enough data to plot hour-of-day patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">When they work</h3>
        <div className="flex gap-1 rounded-md border border-neutral-300 bg-white p-0.5 text-[10px] dark:border-neutral-700 dark:bg-neutral-900">
          {(["local", "utc"] as TZ[]).map((t) => (
            <button
              key={t}
              onClick={() => setTz(t)}
              className={clsx(
                "rounded px-2 py-0.5 transition",
                tz === t
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
              )}
            >
              {t === "local" ? "Your local" : "UTC"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col">
          <div className="flex gap-[2px] pl-10">
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                className={clsx(
                  "w-[14px] text-center text-[9px] text-neutral-500",
                  h % 3 === 0 ? "" : "opacity-0",
                )}
              >
                {h}
              </div>
            ))}
          </div>
          {grid.map((row, day) => (
            <div key={day} className="mt-[2px] flex items-center gap-[2px]">
              <div className="w-10 pr-1 text-right text-[10px] text-neutral-500">
                {DAYS[day]}
              </div>
              {row.map((v, hour) => (
                <div
                  key={hour}
                  title={`${DAYS[day]} ${String(hour).padStart(2, "0")}:00 — ${v} events`}
                  className={clsx(
                    "h-[14px] w-[14px] rounded-[2px]",
                    levelCls[level(v)],
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <Stat
          label="Weekend share"
          value={`${((stats.weekend / stats.total) * 100).toFixed(0)}%`}
          hint="Sat + Sun"
        />
        <Stat
          label="9–18 weekday"
          value={`${((stats.workingHours / stats.total) * 100).toFixed(0)}%`}
          hint="working hours"
        />
        <Stat
          label="Night owl"
          value={`${((stats.nightOwl / stats.total) * 100).toFixed(0)}%`}
          hint="22:00–05:59"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="text-[9px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-[9px] text-neutral-500">{hint}</div>
    </div>
  );
}
