import { notFound } from "next/navigation";
import { GitHubError } from "@/lib/github";
import { getProfileBundleCached } from "@/lib/profile";
import { ProfileSearch } from "@/components/profile-search";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { username: raw } = await params;
  const { q } = await searchParams;
  const username = decodeURIComponent(raw);

  let result;
  try {
    result = await getProfileBundleCached(username);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    throw e;
  }

  return (
    <div className="app-main-scroll scrollbar-thin">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">This profile</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Search</h1>
        </header>
        <ProfileSearch
          username={username}
          prs={result.bundle.pullRequests}
          issues={result.bundle.issues}
          initial={q ?? ""}
        />
      </div>
    </div>
  );
}
