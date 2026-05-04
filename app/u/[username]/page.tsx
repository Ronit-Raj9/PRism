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
    <div className="app-main-scroll scrollbar-thin">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
        <ProfileHeader user={bundle.user} />
        <div className="pt-10">
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
