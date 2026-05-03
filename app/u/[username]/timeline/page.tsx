import { notFound } from "next/navigation";
import { GitHubError } from "@/lib/github";
import { getProfileBundleCached } from "@/lib/profile";
import { buildTimeline } from "@/lib/timeline";
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
  const events = buildTimeline(result.bundle, result.bundle.user.login);

  return (
    <div className="app-main-scroll">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <h1 className="mb-4 text-lg font-semibold">Timeline</h1>
        <TimelineView events={events} />
      </div>
    </div>
  );
}
