"use client";

import clsx from "clsx";
import {
  CheckCheck,
  FileDiff,
  GitCommitHorizontal,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PRSubTab = "discussion" | "commits" | "files" | "reviews";

interface Props {
  sub: PRSubTab;
  setSub: (s: PRSubTab) => void;
  counts: {
    discussion: number;
    commits: number;
    files: number;
    reviews: number;
  };
}

const TABS: { id: PRSubTab; label: string; Icon: LucideIcon; key: string }[] = [
  { id: "discussion", label: "Discussion", Icon: MessageSquare, key: "D" },
  { id: "commits", label: "Commits", Icon: GitCommitHorizontal, key: "C" },
  { id: "files", label: "Files", Icon: FileDiff, key: "F" },
  { id: "reviews", label: "Reviews", Icon: CheckCheck, key: "R" },
];

export function PRTabs({ sub, setSub, counts }: Props) {
  return (
    <div className="flex items-center gap-0 border-b border-neutral-200 bg-white px-5 dark:border-neutral-800 dark:bg-neutral-950">
      {TABS.map(({ id, label, Icon, key }) => {
        const active = sub === id;
        const count = counts[id];
        return (
          <button
            key={id}
            onClick={() => setSub(id)}
            title={`${label} (${key})`}
            className={clsx(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition",
              active
                ? "border-blue-500 text-neutral-900 dark:text-neutral-100"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
            )}
          >
            <Icon size={12} />
            <span>{label}</span>
            <span
              className={clsx(
                "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px]",
                active
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
