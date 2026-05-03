import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getProfileBundle, GitHubError } from "@/lib/github";
import { ProfileHeader } from "@/components/profile-header";
import { SiteHeader } from "@/components/site-header";
import { TimelineView } from "@/components/timeline-view";
import { listSaved } from "@/lib/saved";
import { buildTimeline } from "@/lib/timeline";
import { repoTenures, formatDuration } from "@/lib/insights";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string; owner: string; repo: string }>;
}

export default async function RepoDeepDive({ params }: PageProps) {
  const { username: rawU, owner: rawO, repo: rawR } = await params;
  const username = decodeURIComponent(rawU);
  const owner = decodeURIComponent(rawO);
  const repo = decodeURIComponent(rawR);
  const repoKey = `${owner}/${repo}`;

  let bundle;
  try {
    const result = await getProfileBundle(username);
    bundle = result.bundle;
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    throw e;
  }

  const savedList = await listSaved();

  const events = buildTimeline(bundle, bundle.user.login).filter(
    (e) => e.repo === repoKey,
  );
  const prs = bundle.pullRequests.filter((p) => p.repo.nameWithOwner === repoKey);
  const issues = bundle.issues.filter((i) => i.repo.nameWithOwner === repoKey);

  if (prs.length === 0 && issues.length === 0) {
    return (
      <>
        <SiteHeader savedList={savedList} />
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 text-center">
          <h1 className="text-2xl font-semibold">No activity in {repoKey}</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {username} hasn&apos;t opened any PRs or issues in this repo.
          </p>
          <Link
            href={`/u/${username}`}
            className="mt-6 inline-block rounded-md bg-neutral-900 px-5 py-2 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            ← Back to profile
          </Link>
        </main>
      </>
    );
  }

  const tenure = repoTenures(bundle, bundle.user.login).find(
    (t) => t.repo === repoKey,
  );
  const merged = prs.filter((p) => p.state === "MERGED").length;
  const additions = prs.reduce((s, p) => s + p.additions, 0);
  const deletions = prs.reduce((s, p) => s + p.deletions, 0);

  return (
    <>
      <SiteHeader savedList={savedList} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="mb-4 text-xs text-neutral-500">
          <Link
            href={`/u/${username}`}
            className="hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            ← {bundle.user.login}
          </Link>
          {" / "}
          <span className="font-mono text-neutral-700 dark:text-neutral-300">
            {repoKey}
          </span>
        </div>

        <ProfileHeader user={bundle.user} />

        <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-mono text-lg font-semibold">{repoKey}</h2>
            <a
              href={`https://github.com/${repoKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              github.com/{repoKey} ↗
            </a>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="PRs" value={prs.length.toLocaleString()} />
            <Stat
              label="Merged"
              value={merged.toLocaleString()}
              accent="violet"
            />
            <Stat label="Issues" value={issues.length.toLocaleString()} />
            <Stat
              label="Tenure"
              value={tenure ? formatDuration(tenure.durationMs) : "—"}
              hint={
                tenure
                  ? `${format(tenure.firstAt, "MMM yyyy")} → ${format(tenure.lastAt, "MMM yyyy")}`
                  : undefined
              }
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <span className="rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
              <span className="text-emerald-700 dark:text-emerald-400">
                +{additions.toLocaleString()}
              </span>{" "}
              <span className="text-rose-700 dark:text-rose-400">
                −{deletions.toLocaleString()}
              </span>{" "}
              <span className="text-neutral-500">across all PRs</span>
            </span>
            {tenure ? (
              <>
                <span className="rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
                  ★ {tenure.stars.toLocaleString()} stars
                </span>
                {tenure.primaryLanguage ? (
                  <span className="rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
                    Primary: {tenure.primaryLanguage}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            All activity in this repo
          </h3>
          <TimelineView events={events} />
        </div>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "violet";
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div
        className={
          accent === "violet"
            ? "text-xl font-semibold text-violet-700 dark:text-violet-300"
            : "text-xl font-semibold"
        }
      >
        {value}
      </div>
      {hint ? <div className="text-[10px] text-neutral-500">{hint}</div> : null}
    </div>
  );
}
