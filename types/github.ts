export type PRState = "OPEN" | "MERGED" | "CLOSED";
export type IssueState = "OPEN" | "CLOSED";

export interface RepoRef {
  nameWithOwner: string;
  stargazerCount: number;
  ownerLogin: string;
  primaryLanguage: string | null;
}

export interface CommentNode {
  body: string;
  createdAt: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
}

export interface ReviewCommentNode {
  body: string;
  path: string | null;
  line: number | null;
  diffHunk: string | null;
  createdAt: string;
  authorLogin: string | null;
}

export interface ReviewNode {
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING" | "DISMISSED";
  body: string;
  createdAt: string;
  authorLogin: string | null;
  comments: ReviewCommentNode[];
}

export interface PRNode {
  number: number;
  title: string;
  body: string;
  state: PRState;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  url: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  isDraft: boolean;
  repo: RepoRef;
  comments: CommentNode[];
  reviews: ReviewNode[];
}

export interface IssueNode {
  number: number;
  title: string;
  body: string;
  state: IssueState;
  createdAt: string;
  closedAt: string | null;
  url: string;
  repo: RepoRef;
  labels: { name: string; color: string }[];
  comments: CommentNode[];
}

export interface ContributedRepo {
  nameWithOwner: string;
  stargazerCount: number;
  description: string | null;
  primaryLanguage: string | null;
  url: string;
  ownerLogin: string;
}

export interface ContributionDay {
  date: string;
  count: number;
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: { days: ContributionDay[] }[];
}

export interface UserProfile {
  login: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitterUsername: string | null;
  createdAt: string;
  followers: number;
  following: number;
  publicRepos: number;
}

export interface ContributionStats {
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalReviews: number;
  calendar: ContributionCalendar;
}

export interface ProfileBundle {
  user: UserProfile;
  stats: ContributionStats;
  pullRequests: PRNode[];
  issues: IssueNode[];
  contributedRepos: ContributedRepo[];
  fetchedAt: string;
  rateLimit: { remaining: number; resetAt: string } | null;
}

export interface PRFile {
  path: string;
  status: "added" | "modified" | "removed" | "renamed" | "changed" | "copied" | "unchanged";
  additions: number;
  deletions: number;
  patch: string | null;
  language: string;
}
