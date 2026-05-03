"use client";

import type { ProfileBundle, PRNode, IssueNode } from "@/types/github";
import type { ProjectGroup } from "@/lib/classify";
import type { TimelineEvent } from "@/lib/timeline";
import type { ActivityView } from "./types";
import { ExplorerView } from "./explorer-view";
import { SearchSidebar } from "./search-sidebar";
import { TimelineSidebar } from "./timeline-sidebar";
import { InsightsSidebar } from "./insights-sidebar";

interface Props {
  view: ActivityView;
  username: string;
  bundle: ProfileBundle;
  repoGroups: ProjectGroup[];
  externalIssues: IssueNode[];
  ownPRs: PRNode[];
  events: TimelineEvent[];
  activeTabId: string;
  onOpenPR: (pr: PRNode) => void;
  onOpenIssue: (issue: IssueNode) => void;
  onOpenSpecial: (k: "search" | "timeline" | "insights" | "overview") => void;
}

const TITLES: Record<ActivityView, string> = {
  explorer: "Explorer",
  search: "Search",
  timeline: "Timeline",
  insights: "Insights",
};

export function Sidebar(props: Props) {
  const { view, username, bundle, repoGroups, externalIssues, events } = props;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
          {TITLES[view]}
        </span>
        <span className="text-[10px] text-neutral-500">
          {username}
        </span>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
        {view === "explorer" ? (
          <ExplorerView
            repoGroups={repoGroups}
            ownPRs={props.ownPRs}
            activeTabId={props.activeTabId}
            onOpenPR={props.onOpenPR}
            onOpenIssue={props.onOpenIssue}
            onOpenOverview={() => props.onOpenSpecial("overview")}
          />
        ) : null}
        {view === "search" ? (
          <SearchSidebar
            prs={[...repoGroups.flatMap((g) => g.prs), ...props.ownPRs]}
            issues={externalIssues}
            onOpenPR={props.onOpenPR}
            onOpenIssue={props.onOpenIssue}
          />
        ) : null}
        {view === "timeline" ? (
          <TimelineSidebar events={events} />
        ) : null}
        {view === "insights" ? (
          <InsightsSidebar bundle={bundle} events={events} />
        ) : null}
      </div>
    </div>
  );
}
