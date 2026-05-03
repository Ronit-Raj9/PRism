"use client";

import clsx from "clsx";
import {
  X,
  Plus,
  GitPullRequest,
  GitPullRequestClosed,
  House,
  Search,
  GitBranch,
  BarChart2,
  AlertCircle,
} from "lucide-react";
import type { Tab } from "./types";
import type { MouseEvent } from "react";

interface Props {
  tabs: Tab[];
  activeTabId: string;
  overviewId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

export function TabBar({
  tabs,
  activeTabId,
  overviewId,
  onSelect,
  onClose,
  onNew,
}: Props) {
  function onMouseDown(e: MouseEvent, id: string, closable: boolean) {
    if (e.button === 1 && closable) {
      e.preventDefault();
      onClose(id);
    }
  }

  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="scrollbar-thin flex flex-1 items-stretch overflow-x-auto">
        {tabs.map((t) => {
          const active = t.id === activeTabId;
          const closable = t.id !== overviewId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              onMouseDown={(e) => onMouseDown(e, t.id, closable)}
              className={clsx(
                "group relative flex max-w-[260px] shrink-0 items-center gap-2 border-r border-neutral-200 px-3 text-xs transition dark:border-neutral-800",
                active
                  ? "bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-950 dark:hover:text-neutral-200",
              )}
              title={t.subtitle ? `${t.title} — ${t.subtitle}` : t.title}
            >
              {active ? (
                <span className="absolute inset-x-0 top-0 h-0.5 bg-blue-500" />
              ) : null}
              <TabIcon tab={t} />
              <span className="truncate">{t.title}</span>
              {t.subtitle ? (
                <span className="hidden truncate text-neutral-400 dark:text-neutral-500 md:inline">
                  · {t.subtitle.split("/").pop()}
                </span>
              ) : null}
              {closable ? (
                <span
                  role="button"
                  aria-label="Close tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(t.id);
                  }}
                  className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded text-neutral-400 opacity-0 transition hover:bg-neutral-200 hover:text-neutral-900 group-hover:opacity-100 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                >
                  <X size={12} strokeWidth={2} />
                </span>
              ) : (
                <span className="ml-1 inline-block w-4" />
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onNew}
        title="New search tab"
        className="flex w-9 shrink-0 items-center justify-center border-l border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-950 dark:hover:text-neutral-100"
      >
        <Plus size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

function TabIcon({ tab }: { tab: Tab }) {
  if (tab.kind === "overview")
    return <House size={12} strokeWidth={2} className="shrink-0 text-blue-500" />;
  if (tab.kind === "search")
    return <Search size={12} strokeWidth={2} className="shrink-0 text-neutral-500" />;
  if (tab.kind === "timeline")
    return <GitBranch size={12} strokeWidth={2} className="shrink-0 text-neutral-500" />;
  if (tab.kind === "insights")
    return <BarChart2 size={12} strokeWidth={2} className="shrink-0 text-neutral-500" />;
  if (tab.kind === "issue") {
    const open = tab.issue?.state === "OPEN";
    return (
      <AlertCircle
        size={12}
        strokeWidth={2}
        className={clsx(
          "shrink-0",
          open ? "text-emerald-500" : "text-rose-500",
        )}
      />
    );
  }
  // pr
  if (!tab.pr) return null;
  if (tab.pr.state === "MERGED")
    return <GitPullRequest size={12} strokeWidth={2} className="shrink-0 text-violet-500" />;
  if (tab.pr.state === "OPEN")
    return <GitPullRequest size={12} strokeWidth={2} className="shrink-0 text-emerald-500" />;
  return <GitPullRequestClosed size={12} strokeWidth={2} className="shrink-0 text-rose-500" />;
}
