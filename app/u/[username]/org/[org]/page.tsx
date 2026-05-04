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
          <span className="font-mono text-[var(--foreground)]">
            {org}
          </span>
        </nav>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          {username} @ <span className="font-mono">{org}</span>
        </h1>
        <p className="mb-8 text-sm text-[var(--muted)]">
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
