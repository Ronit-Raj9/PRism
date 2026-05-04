import "server-only";
import { graphql } from "@octokit/graphql";
import { Octokit } from "@octokit/rest";
import {
  PROFILE_QUERY,
  PR_PAGE_QUERY,
  ISSUE_PAGE_QUERY,
  CONTRIBUTED_REPOS_QUERY,
} from "./github-queries";
import {
  getCachedProfile,
  setCachedProfile,
  getCachedPRDiff,
  setCachedPRDiff,
} from "./cache";
import { detectLanguageFromPath } from "./classify";
import type {
  ProfileBundle,
  PRNode,
  IssueNode,
  ContributedRepo,
  PRFile,
  UserProfile,
  ContributionStats,
} from "@/types/github";

const MAX_PR_PAGES = 20; // up to 1000 PRs per profile
const MAX_ISSUE_PAGES = 10; // up to 500 issues per profile
const MAX_REPO_PAGES = 5; // up to 250 contributed repos

function token(): string {
  const t = process.env.GITHUB_TOKEN;
  if (!t)
    throw new GitHubError(
      "GITHUB_TOKEN is not set. Add it to .env.local — see .env.example.",
      500,
    );
  return t;
}

export class GitHubError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "GitHubError";
  }
}

function gql() {
  return graphql.defaults({
    headers: { authorization: `token ${token()}` },
  });
}

function rest() {
  return new Octokit({ auth: token() });
}

interface RateLimitInfo {
  remaining: number;
  resetAt: string;
}

interface ProfileQueryResult {
  user: {
    login: string;
    name: string | null;
    bio: string | null;
    avatarUrl: string;
    company: string | null;
    location: string | null;
    websiteUrl: string | null;
    twitterUsername: string | null;
    createdAt: string;
    followers: { totalCount: number };
    following: { totalCount: number };
    repositories: { totalCount: number };
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestContributions: number;
      totalIssueContributions: number;
      totalPullRequestReviewContributions: number;
      contributionCalendar: {
        totalContributions: number;
        weeks: {
          contributionDays: { date: string; contributionCount: number }[];
        }[];
      };
    };
  } | null;
  rateLimit: RateLimitInfo;
}

interface PRPageResult {
  user: {
    pullRequests: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: RawPRNode[];
    };
  } | null;
  rateLimit: RateLimitInfo;
}

interface RawPRNode {
  number: number;
  title: string;
  body: string | null;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  url: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  repository: {
    nameWithOwner: string;
    stargazerCount: number;
    primaryLanguage: { name: string } | null;
    owner: { login: string };
  };
  comments: {
    nodes: {
      body: string;
      createdAt: string;
      author: { login: string; avatarUrl: string } | null;
    }[];
  };
  reviews: {
    nodes: {
      state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING" | "DISMISSED";
      body: string;
      createdAt: string;
      author: { login: string } | null;
      comments: {
        nodes: {
          body: string;
          path: string | null;
          line: number | null;
          diffHunk: string | null;
          createdAt: string;
          author: { login: string } | null;
        }[];
      };
    }[];
  };
}

interface IssuePageResult {
  user: {
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: RawIssueNode[];
    };
  } | null;
  rateLimit: RateLimitInfo;
}

interface RawIssueNode {
  number: number;
  title: string;
  body: string | null;
  state: "OPEN" | "CLOSED";
  createdAt: string;
  closedAt: string | null;
  url: string;
  repository: {
    nameWithOwner: string;
    stargazerCount: number;
    primaryLanguage: { name: string } | null;
    owner: { login: string };
  };
  labels: { nodes: { name: string; color: string }[] };
  comments: {
    nodes: {
      body: string;
      createdAt: string;
      author: { login: string; avatarUrl: string } | null;
    }[];
  };
}

interface RepoPageResult {
  user: {
    repositoriesContributedTo: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: {
        nameWithOwner: string;
        stargazerCount: number;
        description: string | null;
        url: string;
        primaryLanguage: { name: string } | null;
        owner: { login: string };
      }[];
    };
  } | null;
  rateLimit: RateLimitInfo;
}

function mapPR(n: RawPRNode): PRNode {
  return {
    number: n.number,
    title: n.title,
    body: n.body ?? "",
    state: n.state,
    isDraft: n.isDraft,
    createdAt: n.createdAt,
    mergedAt: n.mergedAt,
    closedAt: n.closedAt,
    url: n.url,
    additions: n.additions,
    deletions: n.deletions,
    changedFiles: n.changedFiles,
    repo: {
      nameWithOwner: n.repository.nameWithOwner,
      stargazerCount: n.repository.stargazerCount,
      ownerLogin: n.repository.owner.login,
      primaryLanguage: n.repository.primaryLanguage?.name ?? null,
    },
    comments: n.comments.nodes.map((c) => ({
      body: c.body,
      createdAt: c.createdAt,
      authorLogin: c.author?.login ?? null,
      authorAvatarUrl: c.author?.avatarUrl ?? null,
    })),
    reviews: n.reviews.nodes.map((r) => ({
      state: r.state,
      body: r.body,
      createdAt: r.createdAt,
      authorLogin: r.author?.login ?? null,
      comments: r.comments.nodes.map((rc) => ({
        body: rc.body,
        path: rc.path,
        line: rc.line,
        diffHunk: rc.diffHunk,
        createdAt: rc.createdAt,
        authorLogin: rc.author?.login ?? null,
      })),
    })),
  };
}

function mapIssue(n: RawIssueNode): IssueNode {
  return {
    number: n.number,
    title: n.title,
    body: n.body ?? "",
    state: n.state,
    createdAt: n.createdAt,
    closedAt: n.closedAt,
    url: n.url,
    repo: {
      nameWithOwner: n.repository.nameWithOwner,
      stargazerCount: n.repository.stargazerCount,
      ownerLogin: n.repository.owner.login,
      primaryLanguage: n.repository.primaryLanguage?.name ?? null,
    },
    labels: n.labels.nodes,
    comments: n.comments.nodes.map((c) => ({
      body: c.body,
      createdAt: c.createdAt,
      authorLogin: c.author?.login ?? null,
      authorAvatarUrl: c.author?.avatarUrl ?? null,
    })),
  };
}

async function fetchProfile(login: string): Promise<{ user: UserProfile; stats: ContributionStats; rateLimit: RateLimitInfo } | null> {
  const data = await gql()<ProfileQueryResult>(PROFILE_QUERY, { login });
  if (!data.user) return null;
  const u = data.user;
  return {
    user: {
      login: u.login,
      name: u.name,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      company: u.company,
      location: u.location,
      blog: u.websiteUrl,
      twitterUsername: u.twitterUsername,
      createdAt: u.createdAt,
      followers: u.followers.totalCount,
      following: u.following.totalCount,
      publicRepos: u.repositories.totalCount,
    },
    stats: {
      totalCommits: u.contributionsCollection.totalCommitContributions,
      totalPRs: u.contributionsCollection.totalPullRequestContributions,
      totalIssues: u.contributionsCollection.totalIssueContributions,
      totalReviews: u.contributionsCollection.totalPullRequestReviewContributions,
      calendar: {
        totalContributions: u.contributionsCollection.contributionCalendar.totalContributions,
        weeks: u.contributionsCollection.contributionCalendar.weeks.map((w) => ({
          days: w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })),
        })),
      },
    },
    rateLimit: data.rateLimit,
  };
}

async function fetchAllPRs(login: string): Promise<{ prs: PRNode[]; rateLimit: RateLimitInfo }> {
  const all: PRNode[] = [];
  let cursor: string | null = null;
  let rateLimit: RateLimitInfo = { remaining: 0, resetAt: "" };
  for (let i = 0; i < MAX_PR_PAGES; i++) {
    const data: PRPageResult = await gql()(PR_PAGE_QUERY, { login, cursor });
    if (!data.user) break;
    all.push(...data.user.pullRequests.nodes.map(mapPR));
    rateLimit = data.rateLimit;
    if (!data.user.pullRequests.pageInfo.hasNextPage) break;
    cursor = data.user.pullRequests.pageInfo.endCursor;
  }
  return { prs: all, rateLimit };
}

async function fetchAllIssues(login: string): Promise<{ issues: IssueNode[]; rateLimit: RateLimitInfo }> {
  const all: IssueNode[] = [];
  let cursor: string | null = null;
  let rateLimit: RateLimitInfo = { remaining: 0, resetAt: "" };
  for (let i = 0; i < MAX_ISSUE_PAGES; i++) {
    const data: IssuePageResult = await gql()(ISSUE_PAGE_QUERY, { login, cursor });
    if (!data.user) break;
    all.push(...data.user.issues.nodes.map(mapIssue));
    rateLimit = data.rateLimit;
    if (!data.user.issues.pageInfo.hasNextPage) break;
    cursor = data.user.issues.pageInfo.endCursor;
  }
  return { issues: all, rateLimit };
}

async function fetchContributedRepos(login: string): Promise<{ repos: ContributedRepo[]; rateLimit: RateLimitInfo }> {
  const all: ContributedRepo[] = [];
  let cursor: string | null = null;
  let rateLimit: RateLimitInfo = { remaining: 0, resetAt: "" };
  for (let i = 0; i < MAX_REPO_PAGES; i++) {
    const data: RepoPageResult = await gql()(CONTRIBUTED_REPOS_QUERY, { login, cursor });
    if (!data.user) break;
    all.push(
      ...data.user.repositoriesContributedTo.nodes.map((r) => ({
        nameWithOwner: r.nameWithOwner,
        stargazerCount: r.stargazerCount,
        description: r.description,
        primaryLanguage: r.primaryLanguage?.name ?? null,
        url: r.url,
        ownerLogin: r.owner.login,
      })),
    );
    rateLimit = data.rateLimit;
    if (!data.user.repositoriesContributedTo.pageInfo.hasNextPage) break;
    cursor = data.user.repositoriesContributedTo.pageInfo.endCursor;
  }
  return { repos: all, rateLimit };
}

export interface FetchResult {
  bundle: ProfileBundle;
  cacheState: "fresh" | "stale" | "miss";
}

/** Get profile bundle, using cache if fresh; otherwise fetch from GitHub. */
export async function getProfileBundle(username: string): Promise<FetchResult> {
  const cached = await getCachedProfile<ProfileBundle>(username);
  if (cached?.state === "fresh") {
    return { bundle: cached.data, cacheState: "fresh" };
  }
  // For MVP, treat stale as fresh-enough — synchronous revalidate would block;
  // serving stale plus a page reload after 1h is acceptable.
  if (cached?.state === "stale") {
    return { bundle: cached.data, cacheState: "stale" };
  }

  const bundle = await fetchProfileBundleLive(username);
  await setCachedProfile(username, bundle);
  return { bundle, cacheState: "miss" };
}

async function fetchProfileBundleLive(username: string): Promise<ProfileBundle> {
  let profile;
  try {
    profile = await fetchProfile(username);
  } catch (e: unknown) {
    const err = e as { status?: number; errors?: { type: string }[] };
    if (err.status === 404 || err.errors?.some((x) => x.type === "NOT_FOUND")) {
      throw new GitHubError(`User '${username}' not found`, 404);
    }
    if (err.status === 401) throw new GitHubError("GitHub token is invalid or expired", 401);
    if (err.status === 403) throw new GitHubError("GitHub rate limit exceeded — try again later", 403);
    throw e;
  }
  if (!profile) throw new GitHubError(`User '${username}' not found`, 404);

  const [{ prs }, { issues }, { repos, rateLimit }] = await Promise.all([
    fetchAllPRs(username),
    fetchAllIssues(username),
    fetchContributedRepos(username),
  ]);

  return {
    user: profile.user,
    stats: profile.stats,
    pullRequests: prs,
    issues: issues,
    contributedRepos: repos,
    fetchedAt: new Date().toISOString(),
    rateLimit,
  };
}

/** Lazy-fetch the file diffs for a single PR (used when user expands a PR row). */
export async function getPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRFile[]> {
  const repoKey = `${owner}/${repo}`;
  const cached = await getCachedPRDiff<PRFile[]>(repoKey, prNumber);
  if (cached) return cached;

  try {
    const res = await rest().pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });
    const files: PRFile[] = res.data.map((f) => ({
      path: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch ?? null,
      language: detectLanguageFromPath(f.filename),
    }));
    await setCachedPRDiff(repoKey, prNumber, files);
    return files;
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err.status === 404)
      throw new GitHubError(`PR ${owner}/${repo}#${prNumber} not found`, 404);
    if (err.status === 403)
      throw new GitHubError("GitHub rate limit exceeded — try again later", 403);
    throw e;
  }
}
