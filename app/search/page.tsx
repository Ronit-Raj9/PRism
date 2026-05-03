import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { listSaved } from "@/lib/saved";
import { searchSaved, type SearchHit, type SearchMatch } from "@/lib/search";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();
  const [savedList, hits] = await Promise.all([
    listSaved(),
    q.length >= 2 ? searchSaved(q) : Promise.resolve([] as SearchHit[]),
  ]);

  const totalMatches = hits.reduce((s, h) => s + h.matches.length, 0);

  return (
    <>
      <SiteHeader savedList={savedList} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <h1 className="text-2xl font-semibold">Search across your saved profiles</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Searches PR titles &amp; bodies, issue threads, comments, reviews, repo
          names, and bios across all{" "}
          <strong className="text-neutral-900 dark:text-neutral-100">
            {savedList.length}
          </strong>{" "}
          saved profile{savedList.length === 1 ? "" : "s"}.
        </p>

        <form className="mt-6 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Try: redis, rust, kernel, mozilla, hooks…"
            autoFocus
            className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Search
          </button>
        </form>

        {savedList.length === 0 ? (
          <EmptyState
            title="No saved profiles to search"
            body={
              <>
                Visit a profile and click <strong>☆ Save</strong> to add it to your watchlist. Once you have a few saved, this page will search across all of them.
              </>
            }
          />
        ) : q.length < 2 ? (
          <SavedListView hits={[]} savedList={savedList} />
        ) : hits.length === 0 ? (
          <EmptyState
            title={`No matches for "${q}"`}
            body="Try a different keyword. Searches are substring matches against cached profile data — refresh a profile if you expect newer activity."
          />
        ) : (
          <div className="mt-8 space-y-4">
            <div className="text-xs text-neutral-500">
              {totalMatches} match{totalMatches === 1 ? "" : "es"} across{" "}
              {hits.length} profile{hits.length === 1 ? "" : "s"}
            </div>
            {hits.map((hit) => (
              <HitCard key={hit.username} hit={hit} q={q} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function HitCard({ hit, q }: { hit: SearchHit; q: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <Link
        href={`/u/${hit.username}`}
        className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
      >
        <Image
          src={hit.avatarUrl}
          alt={hit.username}
          width={32}
          height={32}
          className="h-8 w-8 rounded-full"
          unoptimized
        />
        <div className="flex-1">
          <div className="font-semibold">{hit.label ?? hit.username}</div>
          {hit.label ? (
            <div className="font-mono text-xs text-neutral-500">@{hit.username}</div>
          ) : null}
        </div>
        <span className="text-xs text-neutral-500">
          {hit.matches.length} match{hit.matches.length === 1 ? "" : "es"}
        </span>
      </Link>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {hit.matches.map((m, i) => (
          <li key={i} className="px-4 py-3 text-sm">
            <MatchRow match={m} q={q} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatchRow({ match, q }: { match: SearchMatch; q: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-neutral-500">
        <KindBadge kind={match.kind} />
        {match.repo ? (
          <span className="font-mono text-neutral-600 dark:text-neutral-400">
            {match.repo}
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-sm font-medium">{match.title}</div>
      {match.snippet ? (
        <div className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
          {highlight(match.snippet, q)}
        </div>
      ) : null}
    </div>
  );
}

function KindBadge({ kind }: { kind: SearchMatch["kind"] }) {
  const map: Record<SearchMatch["kind"], string> = {
    pr: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
    issue: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    comment: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    review: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    bio: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    repo: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[kind]}`}
    >
      {kind}
    </span>
  );
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const j = lower.indexOf(needle, i);
    if (j === -1) {
      out.push(text.slice(i));
      break;
    }
    if (j > i) out.push(text.slice(i, j));
    out.push(
      <mark
        key={key++}
        className="rounded bg-amber-200 px-0.5 text-neutral-900 dark:bg-amber-700/60 dark:text-neutral-100"
      >
        {text.slice(j, j + needle.length)}
      </mark>,
    );
    i = j + needle.length;
  }
  return <>{out}</>;
}

function EmptyState({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="mt-12 rounded-md border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
        {body}
      </p>
    </div>
  );
}

function SavedListView({
  savedList,
}: {
  hits: SearchHit[];
  savedList: Awaited<ReturnType<typeof listSaved>>;
}) {
  return (
    <div className="mt-8">
      <h3 className="mb-3 text-sm font-semibold">
        Your watchlist ({savedList.length})
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {savedList.map((s) => (
          <Link
            key={s.username}
            href={`/u/${s.username}`}
            className="rounded-md border border-neutral-200 bg-white p-3 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{s.label ?? s.username}</span>
              {!s.lastVisitedAt ? (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  new
                </span>
              ) : null}
            </div>
            {s.label && s.label !== s.username ? (
              <div className="font-mono text-[11px] text-neutral-500">
                @{s.username}
              </div>
            ) : null}
            {s.note ? (
              <p className="mt-1 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">
                {s.note}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
