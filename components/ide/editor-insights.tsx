"use client";

import type { ProfileBundle } from "@/types/github";
import type { TimelineEvent } from "@/lib/timeline";
import { InsightsTab } from "@/components/insights-tab";

interface Props {
  bundle: ProfileBundle;
  events: TimelineEvent[];
  username: string;
}

export function EditorInsights({ bundle, events, username }: Props) {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <h1 className="mb-4 text-lg font-semibold">Insights</h1>
      <InsightsTab bundle={bundle} events={events} username={username} />
    </div>
  );
}
