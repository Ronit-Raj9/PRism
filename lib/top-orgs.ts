import "server-only";
import { listSaved } from "./saved";
import { getCachedProfile } from "./cache";
import type { ProfileBundle } from "@/types/github";

export interface OrgAggregate {
  org: string;
  contributorCount: number;
  contributors: { username: string; avatarUrl: string }[];
  topRepo: { nameWithOwner: string; stars: number } | null;
  totalMergedPRs: number;
  totalAdditions: number;
}

/**
 * Aggregates external organizations across all *cached* saved profiles.
 *
 * Cheap because it only touches the local Drizzle cache — no GitHub calls.
 * If a profile's bundle isn't cached (rare for a saved profile that's been
 * visited recently), it's skipped.
 */
export async function getTopOrgsFromSaved(limit = 12): Promise<OrgAggregate[]> {
  const saved = await listSaved();
  if (saved.length === 0) return [];

  const bundles = await Promise.all(
    saved.map(async (s) => {
      const cached = await getCachedProfile<ProfileBundle>(s.username);
      return cached ? { username: s.username, bundle: cached.data } : null;
    }),
  );

  const orgs = new Map<string, OrgAggregate>();

  for (const entry of bundles) {
    if (!entry) continue;
    const { username, bundle } = entry;
    const avatarUrl = bundle.user.avatarUrl;

    // External PRs aggregated by ownerLogin.
    const seenContributorPerOrg = new Set<string>();
    for (const pr of bundle.pullRequests) {
      const owner = pr.repo.ownerLogin;
      if (owner.toLowerCase() === username.toLowerCase()) continue; // skip own
      let agg = orgs.get(owner);
      if (!agg) {
        agg = {
          org: owner,
          contributorCount: 0,
          contributors: [],
          topRepo: null,
          totalMergedPRs: 0,
          totalAdditions: 0,
        };
        orgs.set(owner, agg);
      }
      const contribKey = `${owner}::${username}`;
      if (!seenContributorPerOrg.has(contribKey)) {
        seenContributorPerOrg.add(contribKey);
        agg.contributorCount += 1;
        agg.contributors.push({ username: bundle.user.login, avatarUrl });
      }
      if (pr.state === "MERGED") agg.totalMergedPRs += 1;
      agg.totalAdditions += pr.additions;
      if (
        !agg.topRepo ||
        pr.repo.stargazerCount > agg.topRepo.stars ||
        (pr.repo.stargazerCount === agg.topRepo.stars &&
          pr.repo.nameWithOwner.localeCompare(agg.topRepo.nameWithOwner) < 0)
      ) {
        agg.topRepo = {
          nameWithOwner: pr.repo.nameWithOwner,
          stars: pr.repo.stargazerCount,
        };
      }
    }
  }

  const arr = Array.from(orgs.values()).sort((a, b) => {
    if (b.contributorCount !== a.contributorCount)
      return b.contributorCount - a.contributorCount;
    if (b.totalMergedPRs !== a.totalMergedPRs)
      return b.totalMergedPRs - a.totalMergedPRs;
    return (b.topRepo?.stars ?? 0) - (a.topRepo?.stars ?? 0);
  });

  return arr.slice(0, limit);
}
