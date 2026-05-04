"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, Columns2, Rows3 } from "lucide-react";

export type DisplayMode = "unified" | "split";

interface Props {
  additions: number;
  deletions: number;
  displayMode: DisplayMode;
  setDisplayMode: (m: DisplayMode) => void;
  onPrevFile: () => void;
  onNextFile: () => void;
}

export function PRToolbar({
  additions,
  deletions,
  displayMode,
  setDisplayMode,
  onPrevFile,
  onNextFile,
}: Props) {
  const total = additions + deletions;
  const addPct = total > 0 ? (additions / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50/60 px-5 py-1.5 text-[11px] dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex items-center gap-2">
        <span className="font-mono text-emerald-700 dark:text-emerald-400">
          +{additions.toLocaleString()}
        </span>
        <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-rose-300 dark:bg-rose-900">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${addPct}%` }}
          />
        </div>
        <span className="font-mono text-rose-700 dark:text-rose-400">
          −{deletions.toLocaleString()}
        </span>
      </div>

      <div className="ml-2 flex rounded-md border border-neutral-300 bg-white text-[10px] dark:border-neutral-700 dark:bg-neutral-900">
        <ToolbarToggle
          active={displayMode === "unified"}
          onClick={() => setDisplayMode("unified")}
          title="Unified view (S)"
        >
          <Rows3 size={11} />
          Unified
        </ToolbarToggle>
        <ToolbarToggle
          active={displayMode === "split"}
          onClick={() => setDisplayMode("split")}
          title="Split view (S)"
        >
          <Columns2 size={11} />
          Split
        </ToolbarToggle>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onPrevFile}
          title="Previous file ([)"
          className="rounded p-1 text-neutral-600 transition hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <ChevronLeft size={12} />
        </button>
        <button
          onClick={onNextFile}
          title="Next file (])"
          className="rounded p-1 text-neutral-600 transition hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function ToolbarToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        "flex items-center gap-1 px-2 py-1 transition first:rounded-l-md last:rounded-r-md",
        active
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
      )}
    >
      {children}
    </button>
  );
}
