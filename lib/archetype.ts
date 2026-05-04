import type { ProfileSummary } from "./insights-summary";

export interface Archetype {
  id: string;
  label: string;
  blurb: string;
}

/**
 * Rule-based developer archetype classifier. Pure heuristics, no AI.
 * Multiple rules may match — we return the first match in priority order,
 * since that produces the most distinctive label.
 *
 * Thresholds were chosen from the OSS-contributor distributions described
 * in the GitScope spec. They're easy to tune without changing call sites.
 */
export function detectArchetype(s: ProfileSummary): Archetype {
  const ext = s.externalRatio;
  const merged = s.mergedPRs;
  const repos = s.uniqueRepos;
  const orgs = s.uniqueOrgs;
  const langs = s.languageCount;
  const weekendPct = s.weekendPct;
  const nightPct = s.nightOwlPct;
  const additions = s.totalAdditions;
  const deletions = s.totalDeletions;
  const totalLines = additions + deletions;
  const churn = totalLines === 0 ? 0 : deletions / totalLines;
  const builderScore = totalLines === 0 ? 0 : additions / totalLines;

  if (ext >= 0.7 && repos >= 8 && orgs >= 5 && merged >= 10) {
    return {
      id: "oss-ambassador",
      label: "The OSS Ambassador",
      blurb: `${(ext * 100).toFixed(0)}% of PRs are external, across ${repos} repos in ${orgs} organizations — well-connected in the OSS ecosystem.`,
    };
  }

  if (nightPct >= 0.25 && weekendPct >= 0.25) {
    return {
      id: "night-shift-builder",
      label: "The Night-Shift Builder",
      blurb: `${(nightPct * 100).toFixed(0)}% of activity after 22:00 and ${(weekendPct * 100).toFixed(0)}% on weekends — builds on personal time.`,
    };
  }

  if (s.longestStreakDays >= 14 && s.longestGapDays <= 30) {
    return {
      id: "sprint-machine",
      label: "The Sprint Machine",
      blurb: `Longest run of ${s.longestStreakDays} consecutive days of activity — ships in concentrated sprints.`,
    };
  }

  if (churn >= 0.45 && totalLines > 1000) {
    return {
      id: "refactorer",
      label: "The Refactorer",
      blurb: `Removes nearly as much as they add (${(churn * 100).toFixed(0)}% deletions) — refactor- and rewrite-heavy.`,
    };
  }

  if (langs >= 5) {
    return {
      id: "polyglot",
      label: "The Polyglot",
      blurb: `Active in ${langs} primary languages across ${repos} repos — comfortable across stacks.`,
    };
  }

  if (langs >= 1 && s.topLanguage) {
    return {
      id: "specialist",
      label: `The ${s.topLanguage} Specialist`,
      blurb: `Most contributions in ${s.topLanguage}. Builder-leaning (${(builderScore * 100).toFixed(0)}% additions vs deletions).`,
    };
  }

  return {
    id: "generalist",
    label: "The Generalist",
    blurb: `${s.totalPRs} PRs across ${repos} repos. A balanced contributor without a strongly dominant pattern.`,
  };
}
