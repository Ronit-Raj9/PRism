import type { PRNode, IssueNode } from "@/types/github";

export function isExternalContribution(
  item: { repo: { ownerLogin: string } },
  username: string,
): boolean {
  return item.repo.ownerLogin.toLowerCase() !== username.toLowerCase();
}

export function splitInternalExternal<T extends { repo: { ownerLogin: string } }>(
  items: T[],
  username: string,
): { external: T[]; internal: T[] } {
  const external: T[] = [];
  const internal: T[] = [];
  for (const item of items) {
    if (isExternalContribution(item, username)) external.push(item);
    else internal.push(item);
  }
  return { external, internal };
}

export interface ProjectGroup {
  repo: string;
  ownerLogin: string;
  stars: number;
  prs: PRNode[];
  issues: IssueNode[];
  mergedPRs: number;
  totalAdditions: number;
  totalDeletions: number;
}

export function groupByRepo(prs: PRNode[], issues: IssueNode[]): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>();

  for (const pr of prs) {
    const key = pr.repo.nameWithOwner;
    let g = map.get(key);
    if (!g) {
      g = {
        repo: key,
        ownerLogin: pr.repo.ownerLogin,
        stars: pr.repo.stargazerCount,
        prs: [],
        issues: [],
        mergedPRs: 0,
        totalAdditions: 0,
        totalDeletions: 0,
      };
      map.set(key, g);
    }
    g.prs.push(pr);
    g.stars = Math.max(g.stars, pr.repo.stargazerCount);
    if (pr.state === "MERGED") g.mergedPRs++;
    g.totalAdditions += pr.additions;
    g.totalDeletions += pr.deletions;
  }

  for (const issue of issues) {
    const key = issue.repo.nameWithOwner;
    let g = map.get(key);
    if (!g) {
      g = {
        repo: key,
        ownerLogin: issue.repo.ownerLogin,
        stars: issue.repo.stargazerCount,
        prs: [],
        issues: [],
        mergedPRs: 0,
        totalAdditions: 0,
        totalDeletions: 0,
      };
      map.set(key, g);
    }
    g.issues.push(issue);
    g.stars = Math.max(g.stars, issue.repo.stargazerCount);
  }

  return Array.from(map.values()).sort((a, b) => {
    // Sort by: merged PRs first, then stars, then total contributions
    if (b.mergedPRs !== a.mergedPRs) return b.mergedPRs - a.mergedPRs;
    if (b.stars !== a.stars) return b.stars - a.stars;
    return b.prs.length + b.issues.length - (a.prs.length + a.issues.length);
  });
}

const EXT_TO_LANG: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript",
  mjs: "JavaScript", cjs: "JavaScript",
  py: "Python", rb: "Ruby", go: "Go", rs: "Rust", java: "Java", kt: "Kotlin",
  swift: "Swift", c: "C", h: "C", cpp: "C++", cc: "C++", hpp: "C++",
  cs: "C#", php: "PHP", scala: "Scala", clj: "Clojure", ex: "Elixir", exs: "Elixir",
  erl: "Erlang", hs: "Haskell", elm: "Elm", lua: "Lua", r: "R",
  sh: "Shell", bash: "Shell", zsh: "Shell", fish: "Shell",
  yml: "YAML", yaml: "YAML", json: "JSON", toml: "TOML", xml: "XML",
  md: "Markdown", mdx: "Markdown",
  html: "HTML", css: "CSS", scss: "SCSS", sass: "Sass", less: "Less",
  vue: "Vue", svelte: "Svelte", sql: "SQL", graphql: "GraphQL", gql: "GraphQL",
  proto: "Protobuf", dockerfile: "Dockerfile",
};

export function detectLanguageFromPath(path: string): string {
  const filename = path.split("/").pop() ?? path;
  if (/^Dockerfile/i.test(filename)) return "Dockerfile";
  if (/^Makefile/i.test(filename)) return "Makefile";
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return "Other";
  return EXT_TO_LANG[ext] ?? "Other";
}

export function classifyPRSize(loc: number): "trivial" | "small" | "medium" | "large" {
  if (loc < 20) return "trivial";
  if (loc < 100) return "small";
  if (loc < 500) return "medium";
  return "large";
}
