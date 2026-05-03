import { SearchBar } from "@/components/search-bar";
import { SiteHeader } from "@/components/site-header";
import { listSaved } from "@/lib/saved";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const savedList = await listSaved();
  const hasSaved = savedList.length > 0;

  // When there are saved profiles, show the site header (with switcher) and a
  // compact landing. When this is a fresh install, keep the big hero.
  if (hasSaved) {
    return (
      <>
        <SiteHeader savedList={savedList} />
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-3xl text-center">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Analyze any GitHub developer.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
              Type a username, or jump back into your saved watchlist (★ top right).
            </p>
            <div className="mt-8 flex justify-center">
              <SearchBar />
            </div>
          </div>
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
