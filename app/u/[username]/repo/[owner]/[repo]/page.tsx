import Link from "next/link";
import { notFound } from "next/navigation";
import { GitHubError } from "@/lib/github";
import { getProfileBundleCached } from "@/lib/profile";
import { RepoDashboard } from "@/components/repo/repo-dashboard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string; owner: string; repo: string }>;
}

export default async function RepoPage({ params }: PageProps) {
  const { username: rawU, owner: rawO, repo: rawR } = await params;
  const username = decodeURIComponent(rawU);
  const owner = decodeURIComponent(rawO);
  const repo = decodeURIComponent(rawR);
  const repoKey = `${owner}/${repo}`;

  let result;
  try {
    result = await getProfileBundleCached(username);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    throw e;
  }
  const { bundle } = result;

  const repoLower = repoKey.toLowerCase();
  const repoPRs = bundle.pullRequests.filter(
    (pr) => pr.repo.nameWithOwner.toLowerCase() === repoLower,
  );
  const repoIssues = bundle.issues.filter(
    (i) => i.repo.nameWithOwner.toLowerCase() === repoLower,
  );

  return (
    <div className="app-main-scroll scrollbar-thin">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
        <nav className="mb-4 flex items-center gap-2 text-xs text-[var(--muted)]">
          <Link
            href={`/u/${username}`}
            className="hover:text-[var(--foreground)]"
          >
            {username}
          </Link>
          <span>›</span>
          <Link
            href={`/u/${username}/org/${owner}`}
            className="font-mono hover:text-[var(--foreground)]"
          >
            {owner}
          </Link>
          <span>›</span>
          <span className="font-mono text-[var(--foreground)]">
            {repo}
          </span>
        </nav>
        <div className="mb-1 flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="font-mono">{repoKey}</span>
          </h1>
          <a
            href={`https://github.com/${repoKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            GitHub ↗
          </a>
        </div>
        <p className="mb-8 text-sm text-[var(--muted)]">
          {username}&apos;s contributions to {repoKey}.
        </p>
        <RepoDashboard
          username={username}
          owner={owner}
          repo={repo}
          prs={repoPRs}
          issues={repoIssues}
        />
      </div>
    </div>
  );
}
