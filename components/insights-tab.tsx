"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import type { ProfileBundle } from "@/types/github";
import type { TimelineEvent } from "@/lib/timeline";
import {
  activityByMonth,
  prOutcome,
  diffSizeDistribution,
  codeChurn,
  mostProductiveMonth,
  weekendSplit,
  topicCloud,
  repoTenures,
  formatDuration,
  type RepoTenure,
} from "@/lib/insights";
import { isExternalContribution } from "@/lib/classify";

interface Props {
  bundle: ProfileBundle;
  events: TimelineEvent[];
  username: string;
}

export function InsightsTab({ bundle, events, username }: Props) {
  const externalPRs = useMemo(
    () => bundle.pullRequests.filter((pr) => isExternalContribution(pr, username)),
    [bundle, username],
  );

  const months = useMemo(() => activityByMonth(events), [events]);
  const allOutcome = useMemo(() => prOutcome(bundle.pullRequests), [bundle]);
  const externalOutcome = useMemo(() => prOutcome(externalPRs), [externalPRs]);
  const diffSizes = useMemo(
    () => diffSizeDistribution(bundle.pullRequests),
    [bundle],
  );
  const churn = useMemo(() => codeChurn(bundle.pullRequests), [bundle]);
  const topMonth = useMemo(() => mostProductiveMonth(months), [months]);
  const weekend = useMemo(() => weekendSplit(events), [events]);
  const cloud = useMemo(() => topicCloud(bundle.pullRequests), [bundle]);
  const tenures = useMemo(() => repoTenures(bundle, username), [bundle, username]);

  return (
    <div className="space-y-6">
      <ActivityVelocity months={months} topMonth={topMonth.month} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PROutcomeCard label="All PRs" outcome={allOutcome} />
        <PROutcomeCard label="External PRs only" outcome={externalOutcome} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DiffSizeCard buckets={diffSizes} />
        <CodeChurnCard churn={churn} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MostProductiveCard topMonth={topMonth} />
        <WeekendCard split={weekend} />
      </div>

      <TopicCloudCard cloud={cloud} />
      <RepoTenureCard tenures={tenures.filter((t) => t.isExternal).slice(0, 20)} />
    </div>
  );
}

function ActivityVelocity({
  months,
  topMonth,
}: {
  months: ReturnType<typeof activityByMonth>;
  topMonth: string | null;
}) {
  if (months.length === 0) {
    return <Card title="Activity velocity">No activity data.</Card>;
  }
  const data = months.map((m) => ({
    month: m.month,
    PRs: m.prsOpened,
    Merged: m.prsMerged,
    Issues: m.issues,
  }));
  return (
    <Card
      title="Activity velocity"
      subtitle={`Monthly PRs over the last ${months.length} active month${months.length === 1 ? "" : "s"}`}
    >
      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="rgb(229,229,229)" strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="PRs" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Merged" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Issues" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {topMonth ? (
        <p className="mt-2 text-[11px] text-neutral-500">
          Peak month: <strong>{topMonth}</strong>
        </p>
      ) : null}
    </Card>
  );
}

function PROutcomeCard({
  label,
  outcome,
}: {
  label: string;
  outcome: ReturnType<typeof prOutcome>;
}) {
  return (
    <Card title={label}>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <Stat
          label="Merge rate"
          value={`${(outcome.mergeRate * 100).toFixed(0)}%`}
          hint={`${outcome.merged} of ${outcome.total}`}
        />
        <Stat
          label="Median time-to-merge"
          value={
            outcome.medianTimeToMergeMs !== null
              ? formatDuration(outcome.medianTimeToMergeMs)
              : "—"
          }
        />
        <Stat
          label="Avg time-to-merge"
          value={
            outcome.avgTimeToMergeMs !== null
              ? formatDuration(outcome.avgTimeToMergeMs)
              : "—"
          }
        />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
        <BreakdownPill label="Merged" value={outcome.merged} cls="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200" />
        <BreakdownPill label="Closed" value={outcome.closed} cls="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200" />
        <BreakdownPill label="Open" value={outcome.open} cls="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" />
        <BreakdownPill label="Draft" value={outcome.draft} cls="bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" />
      </div>
    </Card>
  );
}

function DiffSizeCard({
  buckets,
}: {
  buckets: ReturnType<typeof diffSizeDistribution>;
}) {
  return (
    <Card
      title="Diff size distribution"
      subtitle="How much code per PR — discipline signal"
    >
      <div className="h-48">
        <ResponsiveContainer>
          <BarChart data={buckets} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="rgb(229,229,229)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function CodeChurnCard({
  churn,
}: {
  churn: ReturnType<typeof codeChurn>;
}) {
  return (
    <Card title="Code footprint" subtitle="Lifetime additions, deletions & magnum opus">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat
          label="Total +"
          value={`+${churn.totalAdditions.toLocaleString()}`}
        />
        <Stat
          label="Total −"
          value={`−${churn.totalDeletions.toLocaleString()}`}
        />
        <Stat
          label="Net lines"
          value={(churn.netLines >= 0 ? "+" : "") + churn.netLines.toLocaleString()}
          hint={churn.netLines >= 0 ? "builder" : "refactorer"}
        />
        <Stat
          label="Files touched"
          value={churn.totalChangedFiles.toLocaleString()}
        />
      </div>
      {churn.biggestPR ? (
        <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="text-[10px] uppercase tracking-wide text-neutral-500">
            Biggest PR ever
          </div>
          <a
            href={churn.biggestPR.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-medium hover:underline"
          >
            {churn.biggestPR.title}
          </a>
          <div className="font-mono text-[11px] text-neutral-500">
            {churn.biggestPR.repo.nameWithOwner}#{churn.biggestPR.number} ·{" "}
            <span className="text-emerald-700 dark:text-emerald-400">
              +{churn.biggestPR.additions.toLocaleString()}
            </span>{" "}
            <span className="text-rose-700 dark:text-rose-400">
              −{churn.biggestPR.deletions.toLocaleString()}
            </span>{" "}
            · {churn.biggestPR.changedFiles} files
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function MostProductiveCard({
  topMonth,
}: {
  topMonth: ReturnType<typeof mostProductiveMonth>;
}) {
  if (!topMonth.month) {
    return (
      <Card title="Most productive month">No activity yet.</Card>
    );
  }
  const [year, m] = topMonth.month.split("-");
  const label = format(new Date(Number(year), Number(m) - 1, 1), "MMMM yyyy");
  return (
    <Card title="Most productive month">
      <div className="text-2xl font-semibold">{label}</div>
      <div className="mt-1 text-xs text-neutral-500">
        {topMonth.total} total events · {topMonth.prsMerged} PRs merged ·{" "}
        {topMonth.prsOpened} opened · {topMonth.issues} issues
      </div>
    </Card>
  );
}

function WeekendCard({
  split,
}: {
  split: ReturnType<typeof weekendSplit>;
}) {
  const pct = (split.weekendPct * 100).toFixed(0);
  return (
    <Card title="Weekend vs weekday">
      <div className="text-2xl font-semibold">{pct}% weekend</div>
      <div className="mt-1 text-xs text-neutral-500">
        {split.weekend.toLocaleString()} weekend events ·{" "}
        {split.weekday.toLocaleString()} weekday events
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full bg-amber-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">
        High weekend share = passion-driven; weekday-only = professional cadence. Neither is bad — just context.
      </p>
    </Card>
  );
}

function TopicCloudCard({
  cloud,
}: {
  cloud: ReturnType<typeof topicCloud>;
}) {
  if (cloud.length === 0) {
    return <Card title="Topic cloud">Not enough PR titles to extract topics.</Card>;
  }
  const max = cloud[0].count;
  return (
    <Card
      title="Topic cloud"
      subtitle="Most-used terms in PR titles — their actual technical domain"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {cloud.map((t) => {
          const ratio = t.count / max;
          const size = 12 + ratio * 16; // 12px..28px
          const opacity = 0.5 + ratio * 0.5;
          return (
            <span
              key={t.term}
              style={{ fontSize: `${size}px`, opacity }}
              className="font-mono leading-tight text-neutral-800 dark:text-neutral-200"
              title={`${t.count} occurrences`}
            >
              {t.term}
            </span>
          );
        })}
      </div>
    </Card>
  );
}

function RepoTenureCard({ tenures }: { tenures: RepoTenure[] }) {
  if (tenures.length === 0) {
    return <Card title="External repo tenure">No external repo data.</Card>;
  }
  const allDates = tenures.flatMap((t) => [t.firstAt.getTime(), t.lastAt.getTime()]);
  const min = Math.min(...allDates);
  const max = Math.max(...allDates);
  const range = max - min || 1;

  return (
    <Card
      title="External repo tenure"
      subtitle="How long they've sustained activity in each project"
    >
      <ul className="space-y-2">
        {tenures.map((t) => {
          const startPct = ((t.firstAt.getTime() - min) / range) * 100;
          const widthPct = Math.max(((t.durationMs) / range) * 100, 0.5);
          return (
            <li key={t.repo} className="text-xs">
              <div className="flex items-baseline justify-between">
                <a
                  href={`https://github.com/${t.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-mono hover:underline"
                >
                  {t.repo}
                </a>
                <span className="shrink-0 text-neutral-500">
                  {formatDuration(t.durationMs)} ·{" "}
                  {t.mergedCount > 0 ? (
                    <span className="text-violet-700 dark:text-violet-300">
                      {t.mergedCount} merged
                    </span>
                  ) : (
                    `${t.prCount} PR${t.prCount === 1 ? "" : "s"}`
                  )}
                </span>
              </div>
              <div className="relative mt-1 h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="absolute h-full rounded-full bg-violet-500"
                  style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                  title={`${format(t.firstAt, "MMM yyyy")} → ${format(t.lastAt, "MMM yyyy")}`}
                />
              </div>
              <div className="mt-0.5 flex justify-between text-[10px] text-neutral-500">
                <span>{format(t.firstAt, "MMM yyyy")}</span>
                <span>{format(t.lastAt, "MMM yyyy")}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle ? (
        <p className="mb-2 mt-0.5 text-[11px] text-neutral-500">{subtitle}</p>
      ) : null}
      <div className={subtitle ? "" : "mt-2"}>{children}</div>
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
  hint?: string;
}) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
      {hint ? <div className="text-[10px] text-neutral-500">{hint}</div> : null}
    </div>
  );
}

function BreakdownPill({
  label,
  value,
  cls,
}: {
  label: string;
  value: number;
  cls: string;
}) {
  return (
    <div className={`rounded-md px-2 py-1.5 text-center ${cls}`}>
      <div className="text-[9px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

