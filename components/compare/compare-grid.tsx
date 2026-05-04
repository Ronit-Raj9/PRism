import Link from "next/link";
import Image from "next/image";
import { TrendingUp } from "lucide-react";
import type { ProfileSummary } from "@/lib/insights-summary";
import { fmtDurationMs } from "@/lib/insights-summary";
import type { GitScopeScore } from "@/lib/gitscope-score";
import type { Archetype } from "@/lib/archetype";

interface CompareResult {
  username: string;
  summary: ProfileSummary | null;
  score: GitScopeScore | null;
  archetype: Archetype | null;
  error: string | null;
}

interface Props {
  results: CompareResult[];
}

type Direction = "higher" | "lower";

interface MetricRow {
  label: string;
  value: (s: ProfileSummary) => number | null;
  format: (s: ProfileSummary) => string;
  better: Direction;
  group: "Velocity" | "Code" | "Reach" | "Activity";
}

const METRICS: MetricRow[] = [
  { group: "Velocity", label: "Total PRs", value: (s) => s.totalPRs, format: (s) => s.totalPRs.toLocaleString(), better: "higher" },
  { group: "Velocity", label: "Merged PRs", value: (s) => s.mergedPRs, format: (s) => s.mergedPRs.toLocaleString(), better: "higher" },
  { group: "Velocity", label: "Merge rate", value: (s) => s.mergeRate, format: (s) => `${(s.mergeRate * 100).toFixed(0)}%`, better: "higher" },
  { group: "Velocity", label: "Median time-to-merge", value: (s) => s.medianTimeToMergeMs ?? Number.POSITIVE_INFINITY, format: (s) => fmtDurationMs(s.medianTimeToMergeMs), better: "lower" },
  { group: "Velocity", label: "External PR ratio", value: (s) => s.externalRatio, format: (s) => `${(s.externalRatio * 100).toFixed(0)}%`, better: "higher" },
  { group: "Code", label: "Lines added", value: (s) => s.totalAdditions, format: (s) => `+${s.totalAdditions.toLocaleString()}`, better: "higher" },
  { group: "Code", label: "Lines removed", value: (s) => s.totalDeletions, format: (s) => `−${s.totalDeletions.toLocaleString()}`, better: "higher" },
  { group: "Code", label: "Net lines", value: (s) => s.netLines, format: (s) => s.netLines.toLocaleString(), better: "higher" },
  { group: "Code", label: "Files changed", value: (s) => s.totalChangedFiles, format: (s) => s.totalChangedFiles.toLocaleString(), better: "higher" },
  { group: "Reach", label: "Repos touched", value: (s) => s.uniqueRepos, format: (s) => s.uniqueRepos.toLocaleString(), better: "higher" },
  { group: "Reach", label: "Orgs touched", value: (s) => s.uniqueOrgs, format: (s) => s.uniqueOrgs.toLocaleString(), better: "higher" },
  { group: "Reach", label: "Languages", value: (s) => s.languageCount, format: (s) => s.languageCount.toLocaleString(), better: "higher" },
  { group: "Reach", label: "Top language", value: () => null, format: (s) => s.topLanguage ?? "—", better: "higher" },
  { group: "Reach", label: "Followers", value: (s) => s.followers, format: (s) => s.followers.toLocaleString(), better: "higher" },
  { group: "Activity", label: "Total events", value: (s) => s.totalEvents, format: (s) => s.totalEvents.toLocaleString(), better: "higher" },
  { group: "Activity", label: "Weekend %", value: (s) => s.weekendPct, format: (s) => `${(s.weekendPct * 100).toFixed(0)}%`, better: "higher" },
  { group: "Activity", label: "Night-owl %", value: (s) => s.nightOwlPct, format: (s) => `${(s.nightOwlPct * 100).toFixed(0)}%`, better: "higher" },
  { group: "Activity", label: "Longest streak", value: (s) => s.longestStreakDays, format: (s) => `${s.longestStreakDays}d`, better: "higher" },
  { group: "Activity", label: "Issues filed", value: (s) => s.totalIssues, format: (s) => s.totalIssues.toLocaleString(), better: "higher" },
];

function leaderIndex(values: (number | null)[], better: Direction): number | null {
  let bestIdx = -1;
  let bestVal = better === "higher" ? -Infinity : Infinity;
  let valid = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    valid++;
    if (better === "higher" ? v > bestVal : v < bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }
  return valid >= 2 ? bestIdx : null;
}

export function CompareGrid({ results }: Props) {
  const cols = Math.max(1, results.length);
  const grid = `1fr repeat(${cols}, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div
        className="grid border-b border-neutral-200 dark:border-neutral-800"
        style={{ gridTemplateColumns: grid }}
      >
        <div />
        {results.map((r) => (
          <ProfileColumnHeader key={r.username} result={r} />
        ))}
      </div>

      {(["Velocity", "Code", "Reach", "Activity"] as const).map((group) => (
        <div key={group}>
          <div
            className="grid border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60"
            style={{ gridTemplateColumns: grid }}
          >
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              {group}
            </div>
            {results.map((_, i) => (
              <div key={i} />
            ))}
          </div>
          {METRICS.filter((m) => m.group === group).map((m) => {
            const values = results.map((r) => (r.summary ? m.value(r.summary) : null));
            const leader = leaderIndex(values, m.better);
            return (
              <div
                key={m.label}
                className="grid border-b border-neutral-100 dark:border-neutral-800/60"
                style={{ gridTemplateColumns: grid }}
              >
                <div className="px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400">
                  {m.label}
                </div>
                {results.map((r, i) => (
                  <div
                    key={r.username}
                    className={
                      "flex items-baseline gap-1 px-3 py-2 text-sm tabular-nums " +
                      (i === leader
                        ? "bg-violet-50 font-semibold text-violet-800 dark:bg-violet-900/20 dark:text-violet-200"
                        : "")
                    }
                  >
                    <span>{r.summary ? m.format(r.summary) : "—"}</span>
                    {i === leader ? (
                      <TrendingUp size={11} className="text-violet-500" />
                    ) : null}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}

      {results.some((r) => r.score) ? (
        <div>
          <div
            className="grid border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60"
            style={{ gridTemplateColumns: grid }}
          >
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              GitScope Score
            </div>
            {results.map((_, i) => (
              <div key={i} />
            ))}
          </div>
          {(["overall", "velocity", "quality", "collaboration", "consistency", "range"] as const).map(
            (k) => {
              const values = results.map((r) => (r.score ? r.score[k] : null));
              const leader = leaderIndex(values, "higher");
              const label = k === "overall" ? "Overall" : k[0].toUpperCase() + k.slice(1);
              return (
                <div
                  key={k}
                  className="grid border-b border-neutral-100 dark:border-neutral-800/60"
                  style={{ gridTemplateColumns: grid }}
                >
                  <div
                    className={
                      "px-3 py-2 text-xs " +
                      (k === "overall"
                        ? "font-semibold text-neutral-800 dark:text-neutral-200"
                        : "text-neutral-600 dark:text-neutral-400")
                    }
                  >
                    {label}
                  </div>
                  {results.map((r, i) => (
                    <div
                      key={r.username}
                      className={
                        "flex items-center gap-2 px-3 py-2 text-sm tabular-nums " +
                        (i === leader
                          ? "bg-violet-50 font-semibold text-violet-800 dark:bg-violet-900/20 dark:text-violet-200"
                          : "")
                      }
                    >
                      {r.score ? (
                        <>
                          <span className="w-8">{r.score[k]}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                            <div
                              className="h-full bg-violet-500"
                              style={{ width: `${r.score[k]}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  ))}
                </div>
              );
            },
          )}
        </div>
      ) : null}
    </div>
  );
}

function ProfileColumnHeader({ result }: { result: CompareResult }) {
  if (!result.summary) {
    return (
      <div className="border-l border-neutral-200 px-3 py-3 dark:border-neutral-800">
        <div className="font-mono text-sm">{result.username}</div>
        <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
          {result.error}
        </div>
      </div>
    );
  }
  const s = result.summary;
  return (
    <div className="border-l border-neutral-200 px-3 py-3 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <Image
          src={s.avatarUrl}
          alt={s.username}
          width={32}
          height={32}
          className="h-8 w-8 rounded-full"
          unoptimized
        />
        <div className="min-w-0">
          <Link
            href={`/u/${s.username}`}
            className="block truncate text-sm font-semibold hover:underline"
            title={s.displayName}
          >
            {s.displayName}
          </Link>
          <div className="truncate font-mono text-[10px] text-neutral-500">
            @{s.username}
          </div>
        </div>
      </div>
      {result.archetype ? (
        <div className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          {result.archetype.label}
        </div>
      ) : null}
    </div>
  );
}
