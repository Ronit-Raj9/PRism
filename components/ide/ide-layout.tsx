"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProfileBundle, PRNode, IssueNode } from "@/types/github";
import type { TimelineEvent } from "@/lib/timeline";
import type { SavedItem } from "@/components/saved-switcher";
import { groupByRepo } from "@/lib/classify";
import { ActivityBar } from "./activity-bar";
import { Sidebar } from "./sidebar";
import { TabBar } from "./tab-bar";
import { StatusBar } from "./status-bar";
import { EditorOverview } from "./editor-overview";
import { EditorPR } from "./editor-pr";
import { EditorIssue } from "./editor-issue";
import { EditorTimeline } from "./editor-timeline";
import { EditorInsights } from "./editor-insights";
import { EditorSearch } from "./editor-search";
import {
  type ActivityView,
  type Tab,
  prTabId,
  issueTabId,
} from "./types";

interface Props {
  bundle: ProfileBundle;
  username: string;
  externalPRs: PRNode[];
  ownPRs: PRNode[];
  externalIssues: IssueNode[];
  events: TimelineEvent[];
  cacheState: "fresh" | "stale" | "miss";
  savedList: SavedItem[];
  initiallySaved: boolean;
}

export function IDELayout(props: Props) {
  const {
    bundle,
    username,
    externalPRs,
    ownPRs,
    externalIssues,
    events,
    cacheState,
  } = props;

  const [activeView, setActiveView] = useState<ActivityView>("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280);

  // Default tab: Overview
  const overviewTab: Tab = useMemo(
    () => ({
      id: "overview",
      kind: "overview",
      title: "Overview",
      subtitle: bundle.user.login,
    }),
    [bundle.user.login],
  );

  const [tabs, setTabs] = useState<Tab[]>([overviewTab]);
  const [activeTabId, setActiveTabId] = useState<string>(overviewTab.id);

  const repoGroups = useMemo(
    () => groupByRepo(externalPRs, externalIssues),
    [externalPRs, externalIssues],
  );

  const openPR = useCallback((pr: PRNode) => {
    const id = prTabId(pr);
    setTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          kind: "pr",
          title: pr.title,
          subtitle: pr.repo.nameWithOwner,
          pr,
        },
      ];
    });
    setActiveTabId(id);
  }, []);

  const openIssue = useCallback((issue: IssueNode) => {
    const id = issueTabId(issue);
    setTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          kind: "issue",
          title: issue.title,
          subtitle: issue.repo.nameWithOwner,
          issue,
        },
      ];
    });
    setActiveTabId(id);
  }, []);

  const openSpecialTab = useCallback(
    (kind: "search" | "timeline" | "insights" | "overview") => {
      const id = kind;
      const titles: Record<typeof kind, string> = {
        search: "Search",
        timeline: "Timeline",
        insights: "Insights",
        overview: "Overview",
      };
      setTabs((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        return [
          ...prev,
          {
            id,
            kind,
            title: titles[kind],
            subtitle: bundle.user.login,
          },
        ];
      });
      setActiveTabId(id);
    },
    [bundle.user.login],
  );

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        if (idx === -1) return prev;
        const next = prev.filter((t) => t.id !== id);
        if (next.length === 0) {
          // Always keep at least the overview tab
          setActiveTabId(overviewTab.id);
          return [overviewTab];
        }
        if (id === activeTabId) {
          const fallback = next[Math.max(0, idx - 1)];
          setActiveTabId(fallback.id);
        }
        return next;
      });
    },
    [activeTabId, overviewTab],
  );

  // Activity icon click — switches sidebar view, also opens corresponding tab for non-explorer
  const onActivityClick = useCallback(
    (view: ActivityView) => {
      if (view === activeView && sidebarOpen) {
        // Toggle sidebar like VS Code
        setSidebarOpen(false);
        return;
      }
      setActiveView(view);
      setSidebarOpen(true);
      if (view === "search") openSpecialTab("search");
      if (view === "timeline") openSpecialTab("timeline");
      if (view === "insights") openSpecialTab("insights");
    },
    [activeView, sidebarOpen, openSpecialTab],
  );

  // Keyboard shortcuts: Ctrl+B (sidebar), Ctrl+Tab (next), Ctrl+Shift+Tab (prev),
  // Ctrl+W (close), Ctrl+1..9 (jump)
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setSidebarOpen((v) => !v);
        return;
      }
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (activeTabId !== overviewTab.id) closeTab(activeTabId);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setActiveTabId((current) => {
          const idx = tabs.findIndex((t) => t.id === current);
          if (idx === -1) return current;
          const next = e.shiftKey
            ? (idx - 1 + tabs.length) % tabs.length
            : (idx + 1) % tabs.length;
          return tabs[next].id;
        });
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < tabs.length) {
          e.preventDefault();
          setActiveTabId(tabs[i].id);
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tabs, activeTabId, closeTab, overviewTab.id]);

  // Sidebar resize
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  function onResizeStart(e: React.MouseEvent) {
    dragRef.current = { startX: e.clientX, startW: sidebarWidth };
    function move(ev: MouseEvent) {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      setSidebarWidth(
        Math.min(560, Math.max(180, dragRef.current.startW + dx)),
      );
    }
    function up() {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? overviewTab;

  const totalLOC = externalPRs.reduce((s, p) => s + p.additions, 0);
  const totalMerged = externalPRs.filter((p) => p.state === "MERGED").length;
  const externalRepoCount = repoGroups.length;

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: sidebarOpen
      ? `48px ${sidebarWidth}px 1fr`
      : `48px 0px 1fr`,
  };

  return (
    <div
      className="grid h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
      style={{
        ...gridStyle,
        gridTemplateRows: "1fr 28px",
      }}
    >
      <div className="row-span-1 border-r border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
        <ActivityBar
          active={activeView}
          sidebarOpen={sidebarOpen}
          onClick={onActivityClick}
        />
      </div>

      <div
        className="relative row-span-1 overflow-hidden border-r border-neutral-200 bg-neutral-100/60 dark:border-neutral-800 dark:bg-neutral-900/60"
        style={{ display: sidebarOpen ? undefined : "none" }}
      >
        <Sidebar
          view={activeView}
          username={username}
          bundle={bundle}
          repoGroups={repoGroups}
          externalIssues={externalIssues}
          ownPRs={ownPRs}
          events={events}
          activeTabId={activeTabId}
          onOpenPR={openPR}
          onOpenIssue={openIssue}
          onOpenSpecial={openSpecialTab}
        />
        {/* drag handle */}
        <div
          onMouseDown={onResizeStart}
          className="absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize hover:bg-blue-500/40"
          aria-label="Resize sidebar"
        />
      </div>

      <div className="row-span-1 flex min-w-0 flex-col overflow-hidden">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={setActiveTabId}
          onClose={closeTab}
          onNew={() => openSpecialTab("search")}
          overviewId={overviewTab.id}
        />
        <div className="min-h-0 flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950">
          <EditorPanel
            tab={activeTab}
            bundle={bundle}
            username={username}
            externalPRs={externalPRs}
            ownPRs={ownPRs}
            externalIssues={externalIssues}
            events={events}
            onOpenPR={openPR}
            onOpenIssue={openIssue}
          />
        </div>
      </div>

      <div className="col-span-3 row-start-2 row-end-3">
        <StatusBar
          username={bundle.user.login}
          merged={totalMerged}
          loc={totalLOC}
          externalRepos={externalRepoCount}
          cacheState={cacheState}
          fetchedAt={bundle.fetchedAt}
          rateRemaining={bundle.rateLimit?.remaining ?? null}
        />
      </div>
    </div>
  );
}

function EditorPanel({
  tab,
  bundle,
  username,
  externalPRs,
  ownPRs,
  externalIssues,
  events,
  onOpenPR,
  onOpenIssue,
}: {
  tab: Tab;
  bundle: ProfileBundle;
  username: string;
  externalPRs: PRNode[];
  ownPRs: PRNode[];
  externalIssues: IssueNode[];
  events: TimelineEvent[];
  onOpenPR: (pr: PRNode) => void;
  onOpenIssue: (issue: IssueNode) => void;
}) {
  if (tab.kind === "pr" && tab.pr) return <EditorPR pr={tab.pr} />;
  if (tab.kind === "issue" && tab.issue)
    return <EditorIssue issue={tab.issue} />;
  if (tab.kind === "timeline")
    return (
      <EditorTimeline
        events={events}
        onOpenPR={onOpenPR}
        onOpenIssue={onOpenIssue}
      />
    );
  if (tab.kind === "insights")
    return (
      <EditorInsights
        bundle={bundle}
        events={events}
        username={username}
      />
    );
  if (tab.kind === "search")
    return (
      <EditorSearch
        prs={[...externalPRs, ...ownPRs]}
        issues={externalIssues}
        onOpenPR={onOpenPR}
        onOpenIssue={onOpenIssue}
      />
    );
  return (
    <EditorOverview
      bundle={bundle}
      username={username}
      events={events}
      externalPRs={externalPRs}
      ownPRs={ownPRs}
    />
  );
}
