import type { ProfileBundle } from "@/types/github";
import { buildTimeline } from "./timeline";
import { isExternalContribution } from "./classify";
import { prOutcome, codeChurn, weekendSplit } from "./insights";

export interface ProfileSummary {
  username: string;
  avatarUrl: string;
  displayName: string;
  followers: number;
  publicRepos: number;
  // PRs
  totalPRs: number;
  mergedPRs: number;
  externalPRs: number;
  externalMerged: number;
  mergeRate: number;
  externalRatio: number;
  avgTimeToMergeMs: number | null;
  medianTimeToMergeMs: number | null;
  // Code
  totalAdditions: number;
  totalDeletions: number;
  netLines: number;
  totalChangedFiles: number;
  // Issues / reviews
  totalIssues: number;
  totalReviews: number;
  // Activity
  totalEvents: number;
  weekendPct: number;
  nightOwlPct: number;
  longestStreakDays: number;
  longestGapDays: number;
  // Reach
  uniqueRepos: number;
  uniqueOrgs: number;
  topLanguage: string | null;
  languageCount: number;
}

const NIGHT_HOURS = new Set([22, 23, 0, 1, 2, 3, 4, 5]);

export function computeProfileInsights(
  bundle: ProfileBundle,
  username: string,
): ProfileSummary {
  const events = buildTimeline(bundle, username);
  const outcome = prOutcome(bundle.pullRequests);
  const churn = codeChurn(bundle.pullRequests);
  const weekend = weekendSplit(events);

  const externalPRsArr = bundle.pullRequests.filter((pr) =>
    isExternalContribution(pr, username),
  );
  const externalMerged = externalPRsArr.filter((pr) => pr.state === "MERGED").length;

  // Night-owl % across events
  let nightCount = 0;
  for (const e of events) {
    if (NIGHT_HOURS.has(e.at.getHours())) nightCount++;
  }
  const nightOwlPct = events.length === 0 ? 0 : nightCount / events.length;

  // Streak + gap
  const days = new Set<string>();
  for (const e of events) {
    days.add(
      `${e.at.getUTCFullYear()}-${e.at.getUTCMonth() + 1}-${e.at.getUTCDate()}`,
    );
  }
  const sortedDays = Array.from(days)
    .map((d) => {
      const [y, m, dd] = d.split("-").map(Number);
      return Date.UTC(y, m - 1, dd);
    })
    .sort((a, b) => a - b);
  let longestStreak = sortedDays.length > 0 ? 1 : 0;
  let curStreak = sortedDays.length > 0 ? 1 : 0;
  let longestGap = 0;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  for (let i = 1; i < sortedDays.length; i++) {
    const diff = sortedDays[i] - sortedDays[i - 1];
    if (diff === ONE_DAY) {
      curStreak++;
      if (curStreak > longestStreak) longestStreak = curStreak;
    } else {
      curStreak = 1;
      const gapDays = Math.round(diff / ONE_DAY) - 1;
      if (gapDays > longestGap) longestGap = gapDays;
    }
  }

  // Reach: unique repos and orgs
  const repoSet = new Set<string>();
  const orgSet = new Set<string>();
  for (const pr of bundle.pullRequests) {
    repoSet.add(pr.repo.nameWithOwner);
    orgSet.add(pr.repo.ownerLogin);
  }
  for (const i of bundle.issues) {
    repoSet.add(i.repo.nameWithOwner);
    orgSet.add(i.repo.ownerLogin);
  }

  // Top language: aggregate primaryLanguage from each repo
  const langCounts = new Map<string, number>();
  for (const pr of bundle.pullRequests) {
    const lang = pr.repo.primaryLanguage;
    if (lang) langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
  }
  let topLang: string | null = null;
  let topCount = 0;
  for (const [lang, c] of langCounts) {
    if (c > topCount) {
      topCount = c;
      topLang = lang;
    }
  }
  return {
    username,
    avatarUrl: bundle.user.avatarUrl,
    displayName: bundle.user.name ?? bundle.user.login,
    followers: bundle.user.followers,
    publicRepos: bundle.user.publicRepos,
    totalPRs: outcome.total,
    mergedPRs: outcome.merged,
    externalPRs: externalPRsArr.length,
    externalMerged,
    mergeRate: outcome.mergeRate,
    externalRatio:
      outcome.total === 0 ? 0 : externalPRsArr.length / outcome.total,
    avgTimeToMergeMs: outcome.avgTimeToMergeMs,
    medianTimeToMergeMs: outcome.medianTimeToMergeMs,
    totalAdditions: churn.totalAdditions,
    totalDeletions: churn.totalDeletions,
    netLines: churn.netLines,
    totalChangedFiles: churn.totalChangedFiles,
    totalIssues: bundle.issues.length,
    totalReviews: bundle.stats.totalReviews,
    totalEvents: events.length,
    weekendPct: weekend.weekendPct,
    nightOwlPct,
    longestStreakDays: longestStreak,
    longestGapDays: longestGap,
    uniqueRepos: repoSet.size,
    uniqueOrgs: orgSet.size,
    topLanguage: topLang,
    languageCount: langCounts.size,
  };
}

export function fmtDurationMs(ms: number | null): string {
  if (ms === null) return "—";
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  if (days < 30) return `${days.toFixed(1)}d`;
  return `${(days / 30).toFixed(1)}mo`;
}
