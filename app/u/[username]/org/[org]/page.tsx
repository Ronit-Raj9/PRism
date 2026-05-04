import Link from "next/link";
import { notFound } from "next/navigation";
import { GitHubError } from "@/lib/github";
import { getProfileBundleCached } from "@/lib/profile";
import { OrgDashboard } from "@/components/org/org-dashboard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string; org: string }>;
}

export default async function OrgPage({ params }: PageProps) {
  const { username: rawU, org: rawO } = await params;
  const username = decodeURIComponent(rawU);
  const org = decodeURIComponent(rawO);

  let result;
  try {
    result = await getProfileBundleCached(username);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    throw e;
  }
  const { bundle } = result;

  const orgLower = org.toLowerCase();
  const orgPRs = bundle.pullRequests.filter(
    (pr) => pr.repo.ownerLogin.toLowerCase() === orgLower,
  );
  const orgIssues = bundle.issues.filter(
    (i) => i.repo.ownerLogin.toLowerCase() === orgLower,
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
          <span className="font-mono text-neutral-700 dark:text-neutral-300">
            {org}
          </span>
        </nav>
        <h1 className="mb-1 text-xl font-semibold">
          {username} @ <span className="font-mono">{org}</span>
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          Contributions in repositories owned by {org}.
        </p>
        <OrgDashboard
          username={username}
          org={org}
          prs={orgPRs}
          issues={orgIssues}
        />
      </div>
    </div>
  );
}
