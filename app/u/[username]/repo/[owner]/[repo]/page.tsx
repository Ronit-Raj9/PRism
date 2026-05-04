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
    <div className="app-main-scroll">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <nav className="mb-3 flex items-center gap-2 text-[12px] text-neutral-500">
          <Link
            href={`/u/${username}`}
            className="hover:text-neutral-900 dark:hover:text-neutral-200"
          >
            {username}
          </Link>
          <span>›</span>
          <Link
            href={`/u/${username}/org/${owner}`}
            className="font-mono hover:text-neutral-900 dark:hover:text-neutral-200"
          >
            {owner}
          </Link>
          <span>›</span>
          <span className="font-mono text-neutral-700 dark:text-neutral-300">
            {repo}
          </span>
        </nav>
        <div className="mb-1 flex items-baseline gap-3">
          <h1 className="text-xl font-semibold">
            <span className="font-mono">{repoKey}</span>
          </h1>
          <a
            href={`https://github.com/${repoKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            GitHub ↗
          </a>
        </div>
        <p className="mb-6 text-sm text-neutral-500">
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
