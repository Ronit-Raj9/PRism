import { notFound } from "next/navigation";
import { GitHubError } from "@/lib/github";
import { getProfileBundleCached } from "@/lib/profile";
import {
  buildTimelinePaged,
  defaultTimelineFilterParams,
  serializeTimelineFilters,
  TIMELINE_INITIAL_LIMIT,
} from "@/lib/timeline";
import { TimelineView } from "@/components/timeline-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function TimelinePage({ params }: PageProps) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);

  let result;
  try {
    result = await getProfileBundleCached(username);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    throw e;
  }
  const initialParams = defaultTimelineFilterParams();
  const { index, rows: initialRows } = buildTimelinePaged(
    result.bundle,
    result.bundle.user.login,
    initialParams,
    0,
    TIMELINE_INITIAL_LIMIT,
  );
  const initialFilterKey = serializeTimelineFilters(initialParams);

  return (
    // No `app-main-scroll` (overflow-y-auto) here: we want the virtualizer's
    // own scroll container to be the *only* scroll element on the page.
    // Nesting two `overflow-y-auto` containers caused ResizeObservers from
    // the inner rows + scroll observers from both containers to interact in a
    // way that ballooned memory on row-expand clicks (Chrome OOM → SIGILL).
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[min(92rem,calc(100vw-1.25rem))] flex-1 flex-col px-4 py-3 sm:px-5 sm:py-4">
        <header className="shrink-0 border-b border-[var(--border)] pb-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted)]">
            Activity
          </p>
          <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Timeline
            </h1>
            <p className="max-w-xl text-xs leading-snug text-[var(--muted)] sm:text-sm">
              PRs, issues, comments, and reviews — filter at the top, scroll the list below.
            </p>
          </div>
        </header>
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <TimelineView
            key={username}
            username={username}
            eventIndex={index}
            initialRows={initialRows}
            initialFilterKey={initialFilterKey}
          />
        </div>
      </div>
    </div>
  );
}
