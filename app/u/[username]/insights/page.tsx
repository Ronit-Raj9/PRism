import { notFound } from "next/navigation";
import { GitHubError } from "@/lib/github";
import { getProfileBundleCached } from "@/lib/profile";
import { buildTimeline } from "@/lib/timeline";
import { computeProfileInsights } from "@/lib/insights-summary";
import { computeGitScopeScore } from "@/lib/gitscope-score";
import { detectArchetype } from "@/lib/archetype";
import { InsightsTab } from "@/components/insights-tab";
import { ArchetypeCard } from "@/components/insights-cards/archetype-card";
import { GitScopeScoreCard } from "@/components/insights-cards/gitscope-score-card";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function InsightsPage({ params }: PageProps) {
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
  const summary = computeProfileInsights(result.bundle, result.bundle.user.login);
  const archetype = detectArchetype(summary);
  const score = computeGitScopeScore(summary);

  return (
    <div className="app-main-scroll">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <h1 className="mb-4 text-lg font-semibold">Insights</h1>
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ArchetypeCard archetype={archetype} />
          <GitScopeScoreCard score={score} />
        </div>
        <InsightsTab
          bundle={result.bundle}
          events={events}
          username={username}
        />
      </div>
    </div>
  );
}
