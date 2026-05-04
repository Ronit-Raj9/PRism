import type { ProfileBundle } from "@/types/github";
import type { TimelineEvent } from "@/lib/timeline";
import { groupByRepo, splitInternalExternal } from "@/lib/classify";
import { MultiLayerHeatmap } from "./multi-layer-heatmap";
import { HourOfDayHeatmap } from "./hour-of-day-heatmap";
import { LanguageBreakdown } from "./language-breakdown";

export function OverviewDashboard({
  bundle,
  username,
  events,
}: {
  bundle: ProfileBundle;
  username: string;
  events: TimelineEvent[];
}) {
  const { external: externalPRs } = splitInternalExternal(bundle.pullRequests, username);
  const { external: externalIssues } = splitInternalExternal(bundle.issues, username);
  const externalGroups = groupByRepo(externalPRs, externalIssues);
  const externalMerged = externalPRs.filter((p) => p.state === "MERGED").length;
  const totalLOCAdded = bundle.pullRequests.reduce((s, p) => s + p.additions, 0);
  const totalLOCRemoved = bundle.pullRequests.reduce((s, p) => s + p.deletions, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI
          label="External PRs merged"
          value={externalMerged}
          accent="violet"
          hint="The headline number"
        />
        <KPI
          label="Total PRs"
          value={bundle.pullRequests.length}
          hint={`${externalPRs.length} external · ${bundle.pullRequests.length - externalPRs.length} own`}
        />
        <KPI
          label="Issues filed"
          value={bundle.issues.length}
          hint={`${externalIssues.length} in external repos`}
        />
        <KPI
          label="Reviews given"
          value={bundle.stats.totalReviews}
          hint="Across all repos (last year)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MultiLayerHeatmap events={events} calendar={bundle.stats.calendar} />
        </div>
        <LanguageBreakdown prs={bundle.pullRequests} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HourOfDayHeatmap events={events} />
        </div>
        <CodeFootprint
          totalLOCAdded={totalLOCAdded}
          totalLOCRemoved={totalLOCRemoved}
          changedFiles={bundle.pullRequests.reduce((s, p) => s + p.changedFiles, 0)}
          totalCommits={bundle.stats.totalCommits}
        />
      </div>

      <TopExternalProjects groups={externalGroups} />
    </div>
  );
}

function KPI({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: "violet";
}) {
  return (
    <div className="ui-panel p-5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div
        className={
          accent === "violet"
            ? "mt-2 text-2xl font-semibold tabular-nums text-violet-600 dark:text-violet-400"
            : "mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]"
        }
      >
        {value.toLocaleString()}
      </div>
      {hint ? <div className="mt-2 text-xs leading-snug text-[var(--muted)]">{hint}</div> : null}
    </div>
  );
}

function TopExternalProjects({
  groups,
}: {
  groups: ReturnType<typeof groupByRepo>;
}) {
  const top = groups.slice(0, 8);
  return (
    <div className="ui-panel p-5">
      <h3 className="mb-4 text-sm font-semibold tracking-tight text-[var(--foreground)]">
        Top external projects
      </h3>
      {top.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No external contributions yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {top.map((g) => (
            <li
              key={g.repo}
              className="flex items-baseline justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
            >
              <a
                href={`https://github.com/${g.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-mono text-[var(--foreground)] hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {g.repo}
              </a>
              <span className="shrink-0 text-xs text-[var(--muted)]">
                ★ {g.stars.toLocaleString()} ·{" "}
                {g.mergedPRs > 0 ? (
                  <span className="text-violet-600 dark:text-violet-400">{g.mergedPRs} merged</span>
                ) : (
                  `${g.prs.length} PR${g.prs.length === 1 ? "" : "s"}`
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CodeFootprint({
  totalLOCAdded,
  totalLOCRemoved,
  changedFiles,
  totalCommits,
}: {
  totalLOCAdded: number;
  totalLOCRemoved: number;
  changedFiles: number;
  totalCommits: number;
}) {
  return (
    <div className="ui-panel p-5">
      <h3 className="mb-4 text-sm font-semibold tracking-tight text-[var(--foreground)]">Code footprint</h3>
      <dl className="space-y-2 text-sm">
        <Row
          k="Lines added"
          v={
            <span className="text-emerald-700 dark:text-emerald-400">
              +{totalLOCAdded.toLocaleString()}
            </span>
          }
        />
        <Row
          k="Lines removed"
          v={
            <span className="text-rose-700 dark:text-rose-400">
              −{totalLOCRemoved.toLocaleString()}
            </span>
          }
        />
        <Row k="Files changed (PRs)" v={changedFiles.toLocaleString()} />
        <Row k="Commits (last year)" v={totalCommits.toLocaleString()} />
      </dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[var(--border)] py-2 last:border-0">
      <dt className="text-[var(--muted)]">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
