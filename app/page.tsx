import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { SavedSwitcher, type SavedItem } from "@/components/saved-switcher";
import { listSaved } from "@/lib/saved";
import { getTopOrgsFromSaved } from "@/lib/top-orgs";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [savedListRaw, topOrgs] = await Promise.all([
    listSaved(),
    getTopOrgsFromSaved(12),
  ]);
  const savedList: SavedItem[] = savedListRaw.map((s) => ({
    username: s.username,
    label: s.label,
    note: s.note,
    lastVisitedAt: s.lastVisitedAt,
  }));
  const hasSaved = savedList.length > 0;

  if (hasSaved) {
    return (
      <>
        <header className="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              GitScope
            </Link>
            <div className="flex-1">
              <SearchBar />
            </div>
            <SavedSwitcher items={savedList} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          <section className="text-center">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Analyze any GitHub developer.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
              Type a username, jump into a saved profile, or explore the top
              organizations your watchlist contributes to.
            </p>
            <div className="mt-6 flex justify-center">
              <SearchBar />
            </div>
          </section>

          <section className="mt-12">
            <SectionHeader
              title="Your watchlist"
              count={savedList.length}
              hint="Saved profiles"
            />
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {savedList.map((s) => (
                <li key={s.username}>
                  <Link
                    href={`/u/${s.username}`}
                    className="group flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-200 font-mono text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {s.username.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {s.label ?? s.username}
                      </div>
                      <div className="truncate font-mono text-[11px] text-neutral-500">
                        @{s.username}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {topOrgs.length > 0 ? (
            <section className="mt-12">
              <SectionHeader
                title="Top organizations"
                count={topOrgs.length}
                hint="Where your watchlist contributes most"
              />
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topOrgs.map((org) => (
                  <li key={org.org}>
                    <a
                      href={`https://github.com/${org.org}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {org.org}
                        </span>
                        <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                          {org.contributorCount} contributor
                          {org.contributorCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      {org.topRepo ? (
                        <div className="mt-1 flex items-center gap-1 truncate text-[11px] text-neutral-500">
                          <Star size={9} className="fill-current text-amber-500" />
                          <span className="font-mono">
                            {org.topRepo.nameWithOwner}
                          </span>
                          <span>· {fmtCount(org.topRepo.stars)}</span>
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                        <div className="-space-x-2">
                          {org.contributors.slice(0, 5).map((c) => (
                            <Image
                              key={c.username}
                              src={c.avatarUrl}
                              alt={c.username}
                              width={20}
                              height={20}
                              unoptimized
                              className="inline-block h-5 w-5 rounded-full ring-2 ring-white dark:ring-neutral-900"
                              title={c.username}
                            />
                          ))}
                        </div>
                        <span className="text-neutral-500">
                          {org.totalMergedPRs} merged PR
                          {org.totalMergedPRs === 1 ? "" : "s"}
                        </span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </main>
      </>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl text-center">
        <div className="mb-3 inline-block rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium tracking-wide text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          GITSCOPE
        </div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          The complete GitHub footprint, in one view.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-neutral-600 dark:text-neutral-400 sm:text-lg">
          External OSS contributions, every PR, every diff, every comment thread —
          unified for any developer. No login, no signup.
        </p>

        <div className="mt-10 flex justify-center">
          <SearchBar />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-neutral-500 dark:text-neutral-500">
          <span>Try:</span>
          {["torvalds", "gaearon", "sindresorhus", "tj"].map((u) => (
            <a
              key={u}
              href={`/u/${u}`}
              className="rounded-full border border-neutral-300 px-3 py-1 transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              {u}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-24 grid w-full max-w-5xl grid-cols-1 gap-6 text-left sm:grid-cols-3">
        <Feature
          title="External contributions first"
          body="The most honest signal about a developer is what they shipped in repos they don't own. We surface that on top, grouped by project, with stars and merge counts."
        />
        <Feature
          title="Inline diffs, no redirects"
          body="Click any PR and see the actual diff with syntax highlighting. Review comments appear on the exact line of code they were left on."
        />
        <Feature
          title="Conversations in context"
          body="Every comment thread on every PR and issue, rendered inline. See how someone handles feedback, debates, and design discussions."
        />
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{body}</p>
    </div>
  );
}

function SectionHeader({
  title,
  count,
  hint,
}: {
  title: string;
  count: number;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {count}
        </span>
      </div>
      {hint ? (
        <span className="text-xs text-neutral-500">{hint}</span>
      ) : null}
    </div>
  );
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}
