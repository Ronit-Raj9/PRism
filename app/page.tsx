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
        <header className="border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-5 py-4 sm:px-8">
            <Link href="/" className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              GitGambit
            </Link>
            <div className="min-w-0 flex-1">
              <SearchBar variant="shell" />
            </div>
            <SavedSwitcher items={savedList} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
          <section className="text-center">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Pick up where you left off
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
              Search anyone on GitHub, or open a saved profile. Your watchlist stays on this device.
            </p>
            <div className="mt-8 flex justify-center">
              <SearchBar />
            </div>
          </section>

          <section className="mt-14">
            <SectionHeader title="Watchlist" count={savedList.length} hint="Saved on this device" />
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {savedList.map((s) => (
                <li key={s.username}>
                  <Link
                    href={`/u/${s.username}`}
                    className="group ui-panel flex items-center gap-3 px-4 py-3 transition hover:border-[var(--border-strong)]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] font-mono text-xs font-semibold text-[var(--foreground)]">
                      {s.username.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-medium">{s.label ?? s.username}</div>
                      <div className="truncate font-mono text-xs text-[var(--muted)]">@{s.username}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {topOrgs.length > 0 ? (
            <section className="mt-14">
              <SectionHeader
                title="Organizations"
                count={topOrgs.length}
                hint="From your watchlist"
              />
              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {topOrgs.map((org) => (
                  <li key={org.org}>
                    <a
                      href={`https://github.com/${org.org}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui-panel block p-4 transition hover:border-[var(--border-strong)]"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-mono text-sm font-semibold text-[var(--foreground)]">
                          {org.org}
                        </span>
                        <span className="shrink-0 rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                          {org.contributorCount} dev{org.contributorCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      {org.topRepo ? (
                        <div className="mt-2 flex items-center gap-1 truncate text-xs text-[var(--muted)]">
                          <Star size={11} className="shrink-0 fill-amber-400 text-amber-500" />
                          <span className="font-mono">{org.topRepo.nameWithOwner}</span>
                          <span>· {fmtCount(org.topRepo.stars)}</span>
                        </div>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                        <div className="-space-x-1.5">
                          {org.contributors.slice(0, 5).map((c) => (
                            <Image
                              key={c.username}
                              src={c.avatarUrl}
                              alt={c.username}
                              width={22}
                              height={22}
                              unoptimized
                              className="inline-block h-[22px] w-[22px] rounded-full ring-2 ring-[var(--surface)]"
                              title={c.username}
                            />
                          ))}
                        </div>
                        <span>
                          {org.totalMergedPRs} merged PR{org.totalMergedPRs === 1 ? "" : "s"}
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
    <main className="flex min-h-[calc(100vh-0px)] flex-col px-5 py-16 sm:px-8">
      <div className="mx-auto w-full max-w-2xl flex-1 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">GitGambit</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          One place for a developer&apos;s public GitHub story
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-pretty text-base leading-relaxed text-[var(--muted)] sm:text-lg">
          Contributions, pull requests, diffs, and threads — without juggling tabs. No account required.
        </p>

        <div className="mt-10 flex justify-center">
          <SearchBar />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--muted)]">
          <span>Try</span>
          {["torvalds", "gaearon", "sindresorhus", "tj"].map((u) => (
            <a
              key={u}
              href={`/u/${u}`}
              className="rounded-full border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
            >
              {u}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-20 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3 sm:gap-5">
        <Feature
          title="External work first"
          body="See what someone shipped outside their own repos — often the clearest signal."
        />
        <Feature
          title="Diffs inside the app"
          body="Open a pull request and read the real diff here, with syntax highlighting."
        />
        <Feature
          title="Threads in context"
          body="Comments and reviews appear next to the work they refer to."
        />
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="ui-panel p-5">
      <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
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
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--muted)]">
          {count}
        </span>
      </div>
      {hint ? <span className="text-xs text-[var(--muted)]">{hint}</span> : null}
    </div>
  );
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}
