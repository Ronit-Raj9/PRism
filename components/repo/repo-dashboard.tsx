import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  GitMerge,
  GitPullRequestArrow,
  GitPullRequestClosed,
} from "lucide-react";
import type { PRNode, IssueNode, PRState } from "@/types/github";

interface Props {
  username: string;
  owner: string;
  repo: string;
  prs: PRNode[];
  issues: IssueNode[];
}

export function RepoDashboard({ username, owner, repo, prs, issues }: Props) {
  if (prs.length === 0 && issues.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm font-medium">No contributions to this repo yet.</p>
        <p className="mt-1 text-xs text-neutral-500">
          The cached bundle has no activity from {username} in {owner}/{repo}.
        </p>
      </div>
    );
  }

  const merged = prs.filter((p) => p.state === "MERGED").length;
  const open = prs.filter((p) => p.state === "OPEN").length;
  const closed = prs.filter((p) => p.state === "CLOSED").length;
  const totalAdditions = prs.reduce((s, p) => s + p.additions, 0);
  const totalDeletions = prs.reduce((s, p) => s + p.deletions, 0);
  const totalFiles = prs.reduce((s, p) => s + p.changedFiles, 0);

  const allDates = [
    ...prs.map((p) => p.createdAt),
    ...issues.map((i) => i.createdAt),
  ].sort();
  const firstDate = allDates[0];
  const lastDate = allDates[allDates.length - 1];

  const sortedPRs = [...prs].sort(
    (a, b) =>
      new Date(b.mergedAt ?? b.createdAt).getTime() -
      new Date(a.mergedAt ?? a.createdAt).getTime(),
  );
  const sortedIssues = [...issues].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="PRs" value={prs.length} />
        <KPI label="Merged" value={merged} accent="violet" />
        <KPI label="Open / Closed" value={`${open} · ${closed}`} />
        <KPI label="Issues" value={issues.length} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KPI label="Lines added" value={`+${totalAdditions.toLocaleString()}`} accent="green" />
        <KPI label="Lines removed" value={`−${totalDeletions.toLocaleString()}`} accent="rose" />
        <KPI label="Files changed" value={totalFiles} />
      </div>

      {firstDate ? (
        <div className="rounded-md border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-neutral-500">First contribution</span>{" "}
          <span className="font-medium">
            {format(parseISO(firstDate), "MMM d, yyyy")}
          </span>
          <span className="mx-3 text-neutral-300 dark:text-neutral-700">·</span>
          <span className="text-neutral-500">Most recent</span>{" "}
          <span className="font-medium">
            {format(parseISO(lastDate), "MMM d, yyyy")}
          </span>
        </div>
      ) : null}

      {sortedPRs.length > 0 ? (
        <section className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-semibold">
            Pull requests ({sortedPRs.length})
          </h2>
          <ul className="space-y-1.5">
            {sortedPRs.map((pr) => (
              <li
                key={pr.number}
                className="flex items-baseline gap-2 border-b border-neutral-100 pb-1.5 last:border-0 dark:border-neutral-800"
              >
                <PRStateIcon state={pr.state} />
                <Link
                  href={`/u/${username}/pr/${owner}/${repo}/${pr.number}`}
                  className="flex-1 truncate text-sm hover:text-violet-600 dark:hover:text-violet-400"
                  title={pr.title}
                >
                  #{pr.number} — {pr.title}
                </Link>
                <span className="shrink-0 text-[11px] tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{pr.additions.toLocaleString()}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-rose-600 dark:text-rose-400">
                  −{pr.deletions.toLocaleString()}
                </span>
                <span className="shrink-0 text-[11px] text-neutral-500">
                  {format(
                    parseISO(pr.mergedAt ?? pr.closedAt ?? pr.createdAt),
                    "MMM d, yyyy",
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sortedIssues.length > 0 ? (
        <section className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-semibold">
            Issues ({sortedIssues.length})
          </h2>
          <ul className="space-y-1.5">
            {sortedIssues.map((i) => (
              <li
                key={i.number}
                className="flex items-baseline gap-2 border-b border-neutral-100 pb-1.5 last:border-0 dark:border-neutral-800"
              >
                <span
                  className={
                    i.state === "CLOSED"
                      ? "h-2 w-2 shrink-0 rounded-full bg-violet-500"
                      : "h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                  }
                />
                <a
                  href={i.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-sm hover:underline"
                  title={i.title}
                >
                  #{i.number} — {i.title}
                </a>
                <span className="shrink-0 text-[11px] text-neutral-500">
                  {format(parseISO(i.createdAt), "MMM d, yyyy")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function KPI({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "violet" | "green" | "rose";
}) {
  const numeric = typeof value === "number" ? value.toLocaleString() : value;
  const cls =
    accent === "violet"
      ? "text-violet-700 dark:text-violet-300"
      : accent === "green"
        ? "text-emerald-700 dark:text-emerald-400"
        : accent === "rose"
          ? "text-rose-700 dark:text-rose-400"
          : "";
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${cls}`}>{numeric}</div>
    </div>
  );
}

function PRStateIcon({ state }: { state: PRState }) {
  if (state === "MERGED")
    return <GitMerge size={12} className="shrink-0 text-violet-500" />;
  if (state === "CLOSED")
    return (
      <GitPullRequestClosed size={12} className="shrink-0 text-rose-500" />
    );
  return (
    <GitPullRequestArrow size={12} className="shrink-0 text-emerald-500" />
  );
}
