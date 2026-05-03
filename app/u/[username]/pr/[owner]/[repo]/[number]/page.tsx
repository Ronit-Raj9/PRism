import { notFound } from "next/navigation";
import { GitHubError } from "@/lib/github";
import { getProfileBundleCached } from "@/lib/profile";
import { PRView } from "@/components/pr/pr-view";
import type { PRNeighbour } from "@/components/pr/pr-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    username: string;
    owner: string;
    repo: string;
    number: string;
  }>;
}

export default async function PRPage({ params }: PageProps) {
  const { username: rawUser, owner, repo, number } = await params;
  const username = decodeURIComponent(rawUser);
  const prNumber = Number(number);
  if (!Number.isFinite(prNumber) || prNumber <= 0) notFound();

  let result;
  try {
    result = await getProfileBundleCached(username);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    throw e;
  }

  const repoKey = `${owner}/${repo}`;
  const repoPRs = result.bundle.pullRequests
    .filter((p) => p.repo.nameWithOwner.toLowerCase() === repoKey.toLowerCase())
    .sort(
      (a, b) =>
        new Date(b.mergedAt ?? b.createdAt).getTime() -
        new Date(a.mergedAt ?? a.createdAt).getTime(),
    );

  const idx = repoPRs.findIndex((p) => p.number === prNumber);
  if (idx === -1) notFound();
  const pr = repoPRs[idx];

  const toRef = (p: (typeof repoPRs)[number]): PRNeighbour => ({
    repo: p.repo.nameWithOwner,
    number: p.number,
    title: p.title,
    state: p.state,
  });

  const prev = idx > 0 ? toRef(repoPRs[idx - 1]) : null;
  const next = idx < repoPRs.length - 1 ? toRef(repoPRs[idx + 1]) : null;

  return <PRView pr={pr} username={username} prev={prev} next={next} />;
}
