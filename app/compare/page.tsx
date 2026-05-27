import Link from "next/link";
import { GitPullRequest } from "lucide-react";
import { GitHubError } from "@/lib/github";
import { getProfileBundleCached } from "@/lib/profile";
import { computeProfileInsights, type ProfileSummary } from "@/lib/insights-summary";
import { computeGitGambitScore } from "@/lib/gitgambit-score";
import { detectArchetype } from "@/lib/archetype";
import { CompareGrid } from "@/components/compare/compare-grid";
import { CompareInput } from "@/components/compare/compare-input";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ u?: string | string[] }>;
}

const MAX_USERS = 3;

function normalizeUsernames(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const out: string[] = [];
  for (const v of arr) {
    const trimmed = v.trim();
    if (!trimmed) continue;
    if (out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= MAX_USERS) break;
  }
  return out;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const usernames = normalizeUsernames(params.u);

  const results = await Promise.all(
    usernames.map(async (u) => {
      try {
        const r = await getProfileBundleCached(u);
        const summary = computeProfileInsights(r.bundle, r.bundle.user.login);
        const score = computeGitGambitScore(summary);
        const archetype = detectArchetype(summary);
        return {
          username: u,
          summary,
          score,
          archetype,
          error: null as string | null,
        };
      } catch (e) {
        const msg =
          e instanceof GitHubError
            ? e.status === 404
              ? "User not found"
              : `GitHub error (${e.status})`
            : e instanceof Error
              ? e.message
              : "Failed to load";
        return {
          username: u,
          summary: null as ProfileSummary | null,
          score: null,
          archetype: null,
          error: msg,
        };
      }
    }),
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="flex h-12 items-center gap-2 border-b border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-950">
        <Link
          href="/"
          className="mr-1 flex items-center gap-1.5 text-sm font-semibold tracking-tight"
        >
          <GitPullRequest size={14} className="text-violet-500" />
          GitGambit
        </Link>
        <span className="text-xs text-neutral-500">/ Compare</span>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-1 text-xl font-semibold">Compare profiles</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Side-by-side stats for up to {MAX_USERS} GitHub users. The leader for
          each metric is highlighted.
        </p>
        <CompareInput usernames={usernames} max={MAX_USERS} />
        {results.length === 0 ? (
          <div className="mt-8 rounded-md border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
            <p className="text-sm text-neutral-500">
              Add at least 2 usernames above to compare.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <CompareGrid results={results} />
          </div>
        )}
      </main>
    </div>
  );
}
