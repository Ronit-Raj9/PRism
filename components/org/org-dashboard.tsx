import Link from "next/link";
import { Star } from "lucide-react";
import type { PRNode, IssueNode } from "@/types/github";
import { groupByRepo } from "@/lib/classify";

interface Props {
  username: string;
  org: string;
  prs: PRNode[];
  issues: IssueNode[];
}

export function OrgDashboard({ username, org, prs, issues }: Props) {
  if (prs.length === 0 && issues.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm font-medium">No contributions in {org} yet.</p>
        <p className="mt-1 text-xs text-neutral-500">
          The bundle has no PRs or issues from this owner.
        </p>
      </div>
    );
  }

  const merged = prs.filter((p) => p.state === "MERGED").length;
  const open = prs.filter((p) => p.state === "OPEN").length;
  const closed = prs.filter((p) => p.state === "CLOSED").length;
  const totalAdditions = prs.reduce((s, p) => s + p.additions, 0);
  const totalDeletions = prs.reduce((s, p) => s + p.deletions, 0);
  const groups = groupByRepo(prs, issues);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="PRs total" value={prs.length} />
        <KPI label="Merged" value={merged} accent="violet" />
        <KPI label="Open / Closed" value={`${open} · ${closed}`} />
        <KPI label="Issues" value={issues.length} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KPI label="Lines added" value={`+${totalAdditions.toLocaleString()}`} accent="green" />
        <KPI label="Lines removed" value={`−${totalDeletions.toLocaleString()}`} accent="rose" />
        <KPI label="Repositories" value={groups.length} />
      </div>

      <section className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold">Repositories in {org}</h2>
        <ul className="space-y-2">
          {groups.map((g) => {
            const [, repoName] = g.repo.split("/");
            return (
              <li
                key={g.repo}
                className="flex items-baseline justify-between gap-3 border-b border-neutral-100 pb-2 last:border-0 dark:border-neutral-800"
              >
                <Link
                  href={`/u/${username}/repo/${org}/${repoName}`}
                  className="truncate font-mono text-sm text-neutral-800 hover:text-violet-600 dark:text-neutral-200 dark:hover:text-violet-400"
                >
                  {g.repo}
                </Link>
                <span className="shrink-0 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-0.5">
                    <Star size={10} className="fill-current" />
                    {g.stars.toLocaleString()}
                  </span>
                  {" · "}
                  <span className="text-violet-700 dark:text-violet-300">
                    {g.mergedPRs} merged
                  </span>
                  {" · "}
                  <span className="text-emerald-700 dark:text-emerald-400">
                    +{g.totalAdditions.toLocaleString()}
                  </span>
                  {" · "}
                  <span className="text-rose-700 dark:text-rose-400">
                    −{g.totalDeletions.toLocaleString()}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
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
