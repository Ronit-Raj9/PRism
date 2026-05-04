import "server-only";
import { db } from "./db";
import { profileCache, savedUsers } from "./db/schema";
import { inArray } from "drizzle-orm";
import type { ProfileBundle } from "@/types/github";

export interface SearchHit {
  username: string;
  label: string | null;
  avatarUrl: string;
  matches: SearchMatch[];
  totalScore: number;
}

export interface SearchMatch {
  kind: "pr" | "issue" | "comment" | "review" | "bio" | "repo";
  title: string;
  snippet: string;
  url: string;
  repo?: string;
  /** Match weight — higher = more relevant. */
  score: number;
}

const MAX_HITS_PER_USER = 12;
const SNIPPET_RADIUS = 60;

function makeSnippet(haystack: string, needle: string): string {
  const idx = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return haystack.slice(0, 120);
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(haystack.length, idx + needle.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < haystack.length ? "…" : "";
  return `${prefix}${haystack.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

function contains(text: string | null | undefined, q: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(q);
}

export async function searchSaved(query: string): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const saved = await db.select().from(savedUsers);
  if (saved.length === 0) return [];
  const usernames = saved.map((s) => s.username);

  const profiles = await db
    .select()
    .from(profileCache)
    .where(inArray(profileCache.username, usernames));

  const labelByUser = new Map(saved.map((s) => [s.username, s.label]));
  const hits: SearchHit[] = [];

  for (const row of profiles) {
    const bundle = row.data as ProfileBundle;
    const matches: SearchMatch[] = [];

    if (contains(bundle.user.bio, q)) {
      matches.push({
        kind: "bio",
        title: "Profile bio",
        snippet: makeSnippet(bundle.user.bio!, q),
        url: `/u/${bundle.user.login}`,
        score: 3,
      });
    }

    for (const repo of bundle.contributedRepos) {
      if (
        contains(repo.nameWithOwner, q) ||
        contains(repo.description, q) ||
        contains(repo.primaryLanguage, q)
      ) {
        matches.push({
          kind: "repo",
          title: repo.nameWithOwner,
          snippet: repo.description ? makeSnippet(repo.description, q) : "",
          url: `/u/${bundle.user.login}`,
          repo: repo.nameWithOwner,
          score: 4,
        });
      }
    }

    for (const pr of bundle.pullRequests) {
      let prMatched = false;
      if (contains(pr.title, q) || contains(pr.repo.nameWithOwner, q)) {
        matches.push({
          kind: "pr",
          title: pr.title,
          snippet: contains(pr.title, q)
            ? makeSnippet(pr.title, q)
            : pr.repo.nameWithOwner,
          url: `/u/${bundle.user.login}`,
          repo: pr.repo.nameWithOwner,
          score: pr.state === "MERGED" ? 10 : 6,
        });
        prMatched = true;
      } else if (contains(pr.body, q)) {
        matches.push({
          kind: "pr",
          title: pr.title,
          snippet: makeSnippet(pr.body, q),
          url: `/u/${bundle.user.login}`,
          repo: pr.repo.nameWithOwner,
          score: pr.state === "MERGED" ? 7 : 4,
        });
        prMatched = true;
      }

      if (!prMatched) {
        for (const c of pr.comments) {
          if (contains(c.body, q)) {
            matches.push({
              kind: "comment",
              title: `Comment in ${pr.repo.nameWithOwner}#${pr.number}`,
              snippet: makeSnippet(c.body, q),
              url: `/u/${bundle.user.login}`,
              repo: pr.repo.nameWithOwner,
              score: 2,
            });
            break;
          }
        }
        for (const r of pr.reviews) {
          if (contains(r.body, q)) {
            matches.push({
              kind: "review",
              title: `Review on ${pr.repo.nameWithOwner}#${pr.number}`,
              snippet: makeSnippet(r.body, q),
              url: `/u/${bundle.user.login}`,
              repo: pr.repo.nameWithOwner,
              score: 3,
            });
            break;
          }
          for (const rc of r.comments) {
            if (contains(rc.body, q)) {
              matches.push({
                kind: "review",
                title: `Review comment on ${pr.repo.nameWithOwner}#${pr.number}`,
                snippet: makeSnippet(rc.body, q),
                url: `/u/${bundle.user.login}`,
                repo: pr.repo.nameWithOwner,
                score: 3,
              });
              break;
            }
          }
        }
      }
    }

    for (const issue of bundle.issues) {
      if (contains(issue.title, q) || contains(issue.body, q)) {
        const fromBody = contains(issue.body, q);
        matches.push({
          kind: "issue",
          title: issue.title,
          snippet: fromBody
            ? makeSnippet(issue.body, q)
            : makeSnippet(issue.title, q),
          url: `/u/${bundle.user.login}`,
          repo: issue.repo.nameWithOwner,
          score: 4,
        });
      } else {
        for (const c of issue.comments) {
          if (contains(c.body, q)) {
            matches.push({
              kind: "comment",
              title: `Comment on ${issue.repo.nameWithOwner}#${issue.number}`,
              snippet: makeSnippet(c.body, q),
              url: `/u/${bundle.user.login}`,
              repo: issue.repo.nameWithOwner,
              score: 2,
            });
            break;
          }
        }
      }
    }

    if (matches.length > 0) {
      const sorted = matches.sort((a, b) => b.score - a.score);
      const totalScore = sorted.reduce((s, m) => s + m.score, 0);
      hits.push({
        username: bundle.user.login,
        label: labelByUser.get(row.username) ?? null,
        avatarUrl: bundle.user.avatarUrl,
        matches: sorted.slice(0, MAX_HITS_PER_USER),
        totalScore,
      });
    }
  }

  return hits.sort((a, b) => b.totalScore - a.totalScore);
}
