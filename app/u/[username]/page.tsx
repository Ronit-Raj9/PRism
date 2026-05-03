import { notFound } from "next/navigation";
import { getProfileBundle, GitHubError } from "@/lib/github";
import { splitInternalExternal } from "@/lib/classify";
import { getSaved, listSaved, touchVisited } from "@/lib/saved";
import { buildTimeline } from "@/lib/timeline";
import { IDELayout } from "@/components/ide/ide-layout";
import type { SavedItem } from "@/components/saved-switcher";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);

  let result;
  try {
    result = await getProfileBundle(username);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    throw e;
  }

  const { bundle, cacheState } = result;
  const [saved, savedListRaw] = await Promise.all([
    getSaved(username),
    listSaved(),
  ]);

  if (saved) {
    void touchVisited(username);
  }

  const { external: externalPRs, internal: ownPRs } = splitInternalExternal(
    bundle.pullRequests,
    username,
  );
  const { external: externalIssues } = splitInternalExternal(
    bundle.issues,
    username,
  );

  const events = buildTimeline(bundle, bundle.user.login);

  const savedList: SavedItem[] = (savedListRaw ?? []).map((s) => ({
    username: s.username,
    label: s.label,
    note: s.note,
    lastVisitedAt: s.lastVisitedAt,
  }));

  return (
    <IDELayout
      bundle={bundle}
      username={username}
      externalPRs={externalPRs}
      ownPRs={ownPRs}
      externalIssues={externalIssues}
      events={events}
      cacheState={cacheState}
      savedList={savedList}
      initiallySaved={Boolean(saved)}
    />
  );
}
