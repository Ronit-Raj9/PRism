"use client";

import clsx from "clsx";
import {
  FolderTree,
  GitBranch,
  Search,
  BarChart2,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import type { ActivityView } from "./types";

interface Props {
  active: ActivityView;
  sidebarOpen: boolean;
  onClick: (v: ActivityView) => void;
}

const ITEMS: { id: ActivityView; label: string; Icon: typeof FolderTree }[] = [
  { id: "explorer", label: "Explorer", Icon: FolderTree },
  { id: "timeline", label: "Timeline", Icon: GitBranch },
  { id: "search", label: "Search", Icon: Search },
  { id: "insights", label: "Insights", Icon: BarChart2 },
];

export function ActivityBar({ active, sidebarOpen, onClick }: Props) {
  return (
    <div className="flex h-full w-12 flex-col items-center justify-between py-2">
      <div className="flex flex-col items-center gap-1">
        {ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id && sidebarOpen;
          return (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => onClick(id)}
              className={clsx(
                "relative flex h-10 w-10 items-center justify-center rounded transition",
                isActive
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
              )}
            >
              {isActive ? (
                <span className="absolute left-0 top-1.5 h-7 w-0.5 rounded-r bg-blue-500" />
              ) : null}
              <Icon size={20} strokeWidth={1.6} />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          title="Settings"
          className="flex h-10 w-10 items-center justify-center rounded text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <Settings size={20} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}

function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => obs.disconnect();
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => false,
  );

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("gitscope-theme", next ? "dark" : "light");
    } catch {
      // ignore (private mode etc.)
    }
  }

  return (
    <button
      type="button"
      title={dark ? "Switch to light" : "Switch to dark"}
      onClick={toggle}
      className="flex h-10 w-10 items-center justify-center rounded text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
    >
      {dark ? <Sun size={20} strokeWidth={1.6} /> : <Moon size={20} strokeWidth={1.6} />}
    </button>
  );
}
