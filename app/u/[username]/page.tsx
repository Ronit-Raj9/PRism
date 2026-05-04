import { notFound } from "next/navigation";
import { GitHubError } from "@/lib/github";
import { getProfileBundleCached } from "@/lib/profile";
import { buildTimeline } from "@/lib/timeline";
import { ProfileHeader } from "@/components/profile-header";
import { OverviewDashboard } from "@/components/overview-dashboard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function OverviewPage({ params }: PageProps) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);

  let result;
  try {
    result = await getProfileBundleCached(username);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    throw e;
  }
  const { bundle } = result;
  const events = buildTimeline(bundle, bundle.user.login);

  return (
    <div className="app-main-scroll">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <ProfileHeader user={bundle.user} />
        <div className="pt-6">
          <OverviewDashboard
            bundle={bundle}
            username={username}
            events={events}
          />
        </div>
      </div>
    </div>
  );
}
