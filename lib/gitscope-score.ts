import type { ProfileSummary } from "./insights-summary";

/**
 * GitScope Score: 0-100 composite signal across 5 sub-scores.
 *
 * Each sub-score is a weighted average of normalized metrics. Inputs are
 * mapped to a 0-100 scale using fixed thresholds (no DB-wide percentile yet
 * — that's a future milestone). When a metric is null/zero (e.g. no merged
 * PRs to derive time-to-merge), it falls back to a conservative neutral
 * value so a brand-new account doesn't score 0/100 unfairly.
 *
 * Thresholds are tuned for active OSS contributors; tweak as we collect
 * real distribution data.
 */
export interface GitScopeScore {
  overall: number;
  velocity: number;
  quality: number;
  collaboration: number;
  consistency: number;
  range: number;
}

function clamp(n: number, min = 0, max = 100): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/** Map a value linearly: at `lo` returns 0, at `hi` returns 100, clamped. */
function bandUp(v: number, lo: number, hi: number): number {
  if (hi === lo) return v >= hi ? 100 : 0;
  return clamp(((v - lo) / (hi - lo)) * 100);
}

/** Inverted: smaller is better. */
function bandDown(v: number, best: number, worst: number): number {
  if (worst === best) return v <= best ? 100 : 0;
  return clamp(((worst - v) / (worst - best)) * 100);
}

export function computeGitScopeScore(s: ProfileSummary): GitScopeScore {
  // Velocity: merge rate, time-to-merge, PR throughput
  const mergeRateScore = bandUp(s.mergeRate, 0.4, 0.95);
  const ttmScore =
    s.medianTimeToMergeMs === null
      ? 50
      : bandDown(s.medianTimeToMergeMs / (1000 * 60 * 60), 1, 168); // 1h ideal, 7d worst
  const throughputScore = bandUp(s.mergedPRs, 0, 80);
  const velocity = Math.round((mergeRateScore + ttmScore + throughputScore) / 3);

  // Quality: merge rate (proxy for clean PRs) + low rejection (closed unmerged)
  const closedUnmerged = Math.max(0, s.totalPRs - s.mergedPRs - 0); // open PRs lumped in but small effect
  const rejectRate =
    s.totalPRs === 0 ? 0 : Math.max(0, (closedUnmerged - 0) / s.totalPRs);
  const rejectScore = bandDown(rejectRate, 0.05, 0.4);
  const filesPerPR = s.totalPRs === 0 ? 0 : s.totalChangedFiles / s.totalPRs;
  // Reasonable PRs are <50 files; mega PRs hurt the quality signal
  const sizeScore = bandDown(filesPerPR, 5, 80);
  const quality = Math.round((mergeRateScore + rejectScore + sizeScore) / 3);

  // Collaboration: external ratio, repo reach, org reach
  const extScore = bandUp(s.externalRatio, 0, 0.7);
  const repoScore = bandUp(s.uniqueRepos, 1, 25);
  const orgScore = bandUp(s.uniqueOrgs, 1, 12);
  const collaboration = Math.round((extScore + repoScore + orgScore) / 3);

  // Consistency: streak length and absence of huge gaps
  const streakScore = bandUp(s.longestStreakDays, 1, 30);
  const gapScore = bandDown(s.longestGapDays, 7, 180);
  const eventScore = bandUp(s.totalEvents, 10, 1000);
  const consistency = Math.round((streakScore + gapScore + eventScore) / 3);

  // Range: language diversity, repo count, file count
  const langScore = bandUp(s.languageCount, 1, 8);
  const fileScore = bandUp(s.totalChangedFiles, 50, 5000);
  const additionsScore = bandUp(s.totalAdditions, 1000, 200000);
  const range = Math.round((langScore + fileScore + additionsScore) / 3);

  const overall = Math.round(
    velocity * 0.25 +
      quality * 0.2 +
      collaboration * 0.25 +
      consistency * 0.15 +
      range * 0.15,
  );

  return { overall, velocity, quality, collaboration, consistency, range };
}
