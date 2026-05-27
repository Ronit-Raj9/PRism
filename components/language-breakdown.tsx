"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import type { PRNode } from "@/types/github";

/**
 * Approximate language breakdown from PR-level totals.
 * Per-file diffs aren't fetched until expand, so we use the PR repo's primary
 * language weighted by additions+deletions as a coarse proxy. Once a user
 * opens a PR, its files are fetched and could refine this in a future pass.
 */
export function LanguageBreakdown({ prs }: { prs: PRNode[] }) {
  const data = useMemo(() => {
    const tally = new Map<string, number>();
    for (const pr of prs) {
      const lang = pr.repo.primaryLanguage ?? "Other";
      const loc = pr.additions + pr.deletions;
      if (loc <= 0) continue;
      tally.set(lang, (tally.get(lang) ?? 0) + loc);
    }
    const entries = Array.from(tally.entries()).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 7);
    const restSum = entries.slice(7).reduce((s, [, v]) => s + v, 0);
    if (restSum > 0) top.push(["Other", restSum]);
    return top.map(([name, value]) => ({ name, value }));
  }, [prs]);

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white p-4 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
        Not enough data to show language breakdown.
      </div>
    );
  }

  const COLORS = [
    "#3178c6", // TS blue
    "#f7df1e", // JS yellow
    "#3776ab", // Python blue
    "#00add8", // Go cyan
    "#dea584", // Rust orange
    "#cc342d", // Ruby red
    "#a97bff", // Kotlin purple
    "#737373", // Other neutral
  ];

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-semibold">Languages (by lines changed)</h3>
      <div className="flex items-center gap-4">
        {/* PieChart with explicit pixel dimensions — no ResponsiveContainer.
            ResponsiveContainer measures its parent via ResizeObserver and
            logs `width(-1) and height(-1)` at hydration whenever the parent
            isn't laid out yet. We don't need responsive sizing here (the
            container is a fixed h-40 w-40), so render the chart directly. */}
        <PieChart width={160} height={160} className="shrink-0">
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx={80}
            cy={80}
            innerRadius={35}
            outerRadius={70}
            paddingAngle={1}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(v) => `${Number(v).toLocaleString()} LOC`}
          />
        </PieChart>
        <ul className="flex-1 space-y-1 text-xs">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="flex-1 truncate font-medium">{d.name}</span>
              <span className="text-neutral-500">
                {((d.value / total) * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-[10px] text-neutral-500">
        Language attribution uses each repo&apos;s primary language as a proxy. Per-file detection requires opening individual PRs.
      </p>
    </div>
  );
}

