import type { ProfileBundle, PRNode } from "@/types/github";
import type { TimelineEvent } from "./timeline";

export interface MonthBucket {
  /** YYYY-MM */
  month: string;
  prsOpened: number;
  prsMerged: number;
  issues: number;
  comments: number;
  reviews: number;
}

export function activityByMonth(events: TimelineEvent[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>();
  for (const e of events) {
    const month = `${e.at.getUTCFullYear()}-${String(e.at.getUTCMonth() + 1).padStart(2, "0")}`;
    let b = map.get(month);
    if (!b) {
      b = { month, prsOpened: 0, prsMerged: 0, issues: 0, comments: 0, reviews: 0 };
      map.set(month, b);
    }
    if (e.kind === "PR_OPENED") b.prsOpened++;
    else if (e.kind === "PR_MERGED") b.prsMerged++;
    else if (e.kind === "ISSUE_OPENED") b.issues++;
    else if (e.kind === "PR_COMMENT" || e.kind === "ISSUE_COMMENT") b.comments++;
    else if (e.kind === "REVIEW_GIVEN" || e.kind === "REVIEW_COMMENT") b.reviews++;
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export interface PROutcome {
  total: number;
  merged: number;
  closed: number;
  open: number;
  draft: number;
  mergeRate: number;
  avgTimeToMergeMs: number | null;
  medianTimeToMergeMs: number | null;
}

export function prOutcome(prs: PRNode[]): PROutcome {
  let merged = 0, closed = 0, open = 0, draft = 0;
  const mergeDurations: number[] = [];
  for (const pr of prs) {
    if (pr.state === "MERGED") {
      merged++;
      if (pr.mergedAt) {
        mergeDurations.push(
          new Date(pr.mergedAt).getTime() - new Date(pr.createdAt).getTime(),
        );
      }
    } else if (pr.state === "CLOSED") {
      closed++;
    } else if (pr.isDraft) {
      draft++;
    } else {
      open++;
    }
  }
  mergeDurations.sort((a, b) => a - b);
  const avg = mergeDurations.length
    ? mergeDurations.reduce((s, n) => s + n, 0) / mergeDurations.length
    : null;
  const median = mergeDurations.length
    ? mergeDurations[Math.floor(mergeDurations.length / 2)]
    : null;
  return {
    total: prs.length,
    merged,
    closed,
    open,
    draft,
    mergeRate: prs.length === 0 ? 0 : merged / prs.length,
    avgTimeToMergeMs: avg,
    medianTimeToMergeMs: median,
  };
}

export interface DiffSizeBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export function diffSizeDistribution(prs: PRNode[]): DiffSizeBucket[] {
  const buckets: DiffSizeBucket[] = [
    { label: "<20", min: 0, max: 20, count: 0 },
    { label: "20–100", min: 20, max: 100, count: 0 },
    { label: "100–500", min: 100, max: 500, count: 0 },
    { label: "500–1k", min: 500, max: 1000, count: 0 },
    { label: "1k–5k", min: 1000, max: 5000, count: 0 },
    { label: "5k+", min: 5000, max: Infinity, count: 0 },
  ];
  for (const pr of prs) {
    const loc = pr.additions + pr.deletions;
    for (const b of buckets) {
      if (loc >= b.min && loc < b.max) {
        b.count++;
        break;
      }
    }
  }
  return buckets;
}

export interface CodeChurn {
  totalAdditions: number;
  totalDeletions: number;
  netLines: number;
  totalChangedFiles: number;
  biggestPR: PRNode | null;
  mostFilesPR: PRNode | null;
  builderScore: number; // additions / (additions + deletions)
}

export function codeChurn(prs: PRNode[]): CodeChurn {
  let additions = 0, deletions = 0, files = 0;
  let biggest: PRNode | null = null;
  let mostFiles: PRNode | null = null;
  for (const pr of prs) {
    additions += pr.additions;
    deletions += pr.deletions;
    files += pr.changedFiles;
    if (!biggest || pr.additions + pr.deletions > biggest.additions + biggest.deletions) {
      biggest = pr;
    }
    if (!mostFiles || pr.changedFiles > mostFiles.changedFiles) {
      mostFiles = pr;
    }
  }
  return {
    totalAdditions: additions,
    totalDeletions: deletions,
    netLines: additions - deletions,
    totalChangedFiles: files,
    biggestPR: biggest,
    mostFilesPR: mostFiles,
    builderScore: additions + deletions > 0 ? additions / (additions + deletions) : 0,
  };
}

export interface MostProductiveMonth {
  month: string | null;
  total: number;
  prsMerged: number;
  prsOpened: number;
  issues: number;
}

export function mostProductiveMonth(buckets: MonthBucket[]): MostProductiveMonth {
  let best: MonthBucket | null = null;
  let bestTotal = 0;
  for (const b of buckets) {
    const total = b.prsOpened + b.prsMerged + b.issues + b.comments + b.reviews;
    if (total > bestTotal) {
      best = b;
      bestTotal = total;
    }
  }
  return {
    month: best?.month ?? null,
    total: bestTotal,
    prsMerged: best?.prsMerged ?? 0,
    prsOpened: best?.prsOpened ?? 0,
    issues: best?.issues ?? 0,
  };
}

export interface WeekendSplit {
  total: number;
  weekday: number;
  weekend: number;
  weekendPct: number;
}

export function weekendSplit(events: TimelineEvent[]): WeekendSplit {
  let weekday = 0, weekend = 0;
  for (const e of events) {
    const day = e.at.getDay();
    if (day === 0 || day === 6) weekend++;
    else weekday++;
  }
  const total = weekday + weekend;
  return {
    total,
    weekday,
    weekend,
    weekendPct: total === 0 ? 0 : weekend / total,
  };
}

const STOPWORDS = new Set([
  "a", "an", "and", "or", "but", "the", "of", "to", "in", "on", "for", "with",
  "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "this", "that", "these", "those", "it", "its", "at", "into", "if", "than",
  "then", "so", "such", "we", "you", "your", "our", "i", "me", "my", "they",
  "them", "their", "fix", "feat", "chore", "docs", "test", "tests", "wip",
  "add", "added", "adding", "remove", "removed", "removing", "update",
  "updated", "updating", "use", "using", "make", "makes", "support",
  "improve", "fixes", "via", "when", "where", "which", "what", "how",
  "after", "before", "no", "not", "now", "rfc", "draft", "ci",
  "feature", "features", "change", "changes", "changed", "merge", "release",
  "v1", "v2", "v3",
]);

const TOKEN_RE = /[a-zA-Z][a-zA-Z0-9_]{2,}/g;

export interface TopicTerm {
  term: string;
  count: number;
}

export function topicCloud(prs: PRNode[], maxTerms = 60): TopicTerm[] {
  const counts = new Map<string, number>();
  for (const pr of prs) {
    const text = pr.title;
    const matches = text.match(TOKEN_RE) ?? [];
    for (const raw of matches) {
      const t = raw.toLowerCase();
      if (STOPWORDS.has(t)) continue;
      if (t.length < 3) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxTerms);
}

export interface RepoTenure {
  repo: string;
  ownerLogin: string;
  isExternal: boolean;
  stars: number;
  primaryLanguage: string | null;
  firstAt: Date;
  lastAt: Date;
  prCount: number;
  mergedCount: number;
  issueCount: number;
  durationMs: number;
}

export function repoTenures(
  bundle: ProfileBundle,
  username: string,
): RepoTenure[] {
  const map = new Map<string, RepoTenure>();
  function ensure(
    repo: string,
    ownerLogin: string,
    stars: number,
    lang: string | null,
  ): RepoTenure {
    let r = map.get(repo);
    if (!r) {
      r = {
        repo,
        ownerLogin,
        isExternal: ownerLogin.toLowerCase() !== username.toLowerCase(),
        stars,
        primaryLanguage: lang,
        firstAt: new Date(8640000000000000),
        lastAt: new Date(0),
        prCount: 0,
        mergedCount: 0,
        issueCount: 0,
        durationMs: 0,
      };
      map.set(repo, r);
    } else {
      r.stars = Math.max(r.stars, stars);
      if (!r.primaryLanguage && lang) r.primaryLanguage = lang;
    }
    return r;
  }
  for (const pr of bundle.pullRequests) {
    const r = ensure(
      pr.repo.nameWithOwner,
      pr.repo.ownerLogin,
      pr.repo.stargazerCount,
      pr.repo.primaryLanguage,
    );
    const created = new Date(pr.createdAt);
    if (created < r.firstAt) r.firstAt = created;
    if (created > r.lastAt) r.lastAt = created;
    if (pr.mergedAt) {
      const merged = new Date(pr.mergedAt);
      if (merged > r.lastAt) r.lastAt = merged;
      r.mergedCount++;
    }
    r.prCount++;
  }
  for (const issue of bundle.issues) {
    const r = ensure(
      issue.repo.nameWithOwner,
      issue.repo.ownerLogin,
      issue.repo.stargazerCount,
      issue.repo.primaryLanguage,
    );
    const created = new Date(issue.createdAt);
    if (created < r.firstAt) r.firstAt = created;
    if (created > r.lastAt) r.lastAt = created;
    r.issueCount++;
  }
  return Array.from(map.values())
    .filter((r) => r.prCount + r.issueCount > 0)
    .map((r) => ({ ...r, durationMs: r.lastAt.getTime() - r.firstAt.getTime() }))
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

export function formatDuration(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return "<1 day";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  const remMonths = Math.floor((days - years * 365) / 30);
  return remMonths > 0 ? `${years}y ${remMonths}mo` : `${years}y`;
}
