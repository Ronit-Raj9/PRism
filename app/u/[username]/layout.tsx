import { notFound } from "next/navigation";
import { GitHubError } from "@/lib/github";
import { getProfileBundleCached } from "@/lib/profile";
import { groupByRepoSlim, splitInternalExternal } from "@/lib/classify";
import { getSaved, listSaved, touchVisited } from "@/lib/saved";
import { AppShell } from "@/components/shell/app-shell";
import type { SavedItem } from "@/components/saved-switcher";

export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}

export default async function ProfileLayout({ children, params }: LayoutProps) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);

  let result;
  try {
    result = await getProfileBundleCached(username);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    throw e;
  }
  const { bundle, cacheState } = result;

  const [saved, savedListRaw] = await Promise.all([
    getSaved(username),
    listSaved(),
  ]);
  if (saved) void touchVisited(username);

  const { external: externalPRs, internal: ownPRs } = splitInternalExternal(
    bundle.pullRequests,
    username,
  );
  const { external: externalIssues, internal: ownIssues } = splitInternalExternal(
    bundle.issues,
    username,
  );

  // Slim groups: only the fields the sidebar tree renders. Avoids serializing
  // PR bodies/comments/reviews into the RSC payload on every navigation.
  const externalGroups = groupByRepoSlim(externalPRs, externalIssues);
  const ownGroups = groupByRepoSlim(ownPRs, ownIssues);

  const savedList: SavedItem[] = (savedListRaw ?? []).map((s) => ({
    username: s.username,
    label: s.label,
    note: s.note,
    lastVisitedAt: s.lastVisitedAt,
  }));

  return (
    <AppShell
      user={bundle.user}
      username={username}
      cacheState={cacheState}
      fetchedAt={bundle.fetchedAt}
      rateRemaining={bundle.rateLimit?.remaining ?? null}
      externalGroups={externalGroups}
      ownGroups={ownGroups}
      savedList={savedList}
      initiallySaved={Boolean(saved)}
    >
      {children}
    </AppShell>
  );
}
