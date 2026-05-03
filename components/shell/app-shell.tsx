"use client";

import { useEffect, useMemo } from "react";
import type { ProfileBundle } from "@/types/github";
import type { SavedItem } from "@/components/saved-switcher";
import { TopBar } from "./top-bar";
import { Sidebar } from "./sidebar";
import type { RepoTreeGroup } from "./repo-tree";
import { useStoredValue } from "./use-stored-value";

const SIDEBAR_WIDTH_KEY = "gitscope-sidebar-w";
const SIDEBAR_OPEN_KEY = "gitscope-sidebar-open";
const DEFAULT_W = 260;
const MIN_W = 200;
const MAX_W = 480;

interface Props {
  bundle: ProfileBundle;
  username: string;
  cacheState: "fresh" | "stale" | "miss";
  externalGroups: RepoTreeGroup[];
  ownGroups: RepoTreeGroup[];
  savedList: SavedItem[];
  initiallySaved: boolean;
  children: React.ReactNode;
}

export function AppShell({
  bundle,
  username,
  cacheState,
  externalGroups,
  ownGroups,
  savedList,
  initiallySaved,
  children,
}: Props) {
  const [storedWidth, writeWidth] = useStoredValue(SIDEBAR_WIDTH_KEY);
  const [storedOpen, writeOpen] = useStoredValue(SIDEBAR_OPEN_KEY);

  const width = useMemo(() => {
    const n = Number(storedWidth);
    if (!Number.isFinite(n) || n < MIN_W || n > MAX_W) return DEFAULT_W;
    return n;
  }, [storedWidth]);

  const open = storedOpen !== "0"; // default open

  // Lock global page scroll while the shell is mounted.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.app = "shell";
    return () => {
      delete root.dataset.app;
    };
  }, []);

  // Reflect width/open into a CSS custom property so the grid resizes.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-w",
      open ? `${width}px` : "0px",
    );
  }, [width, open]);

  // Global keyboard:
  //   ⌘K / Ctrl+K → focus top-bar search
  //   b           → toggle sidebar
  //   j / k       → move highlight across visible PR rows in the sidebar
  //   Enter       → open the highlighted PR
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const isField =
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        t?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(
          "[data-topbar-search] input",
        );
        el?.focus();
        el?.select();
        return;
      }

      if (isField) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        writeOpen(open ? "0" : "1");
        return;
      }

      if (e.key === "j" || e.key === "k" || e.key === "Enter") {
        const rows = Array.from(
          document.querySelectorAll<HTMLAnchorElement>("[data-pr-row]"),
        );
        if (rows.length === 0) return;
        const focused = document.activeElement as HTMLElement | null;
        let idx = rows.findIndex((r) => r === focused);
        if (e.key === "Enter") {
          if (idx >= 0) {
            e.preventDefault();
            rows[idx].click();
          }
          return;
        }
        e.preventDefault();
        if (idx === -1) {
          // Default to currently active row, or the first row
          idx = rows.findIndex((r) => r.dataset.prActive === "true");
          if (idx === -1) idx = 0;
        } else {
          idx = e.key === "j" ? idx + 1 : idx - 1;
          idx = Math.max(0, Math.min(rows.length - 1, idx));
        }
        rows[idx].focus();
        rows[idx].scrollIntoView({ block: "nearest" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, writeOpen]);

  function startResize(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const move = (ev: PointerEvent) => {
      const next = Math.max(
        MIN_W,
        Math.min(MAX_W, startW + (ev.clientX - startX)),
      );
      document.documentElement.style.setProperty("--sidebar-w", `${next}px`);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const final = Math.max(
        MIN_W,
        Math.min(MAX_W, startW + (ev.clientX - startX)),
      );
      writeWidth(String(final));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className="app-shell">
      <TopBar
        username={username}
        savedList={savedList}
        initiallySaved={initiallySaved}
        cacheState={cacheState}
        fetchedAt={bundle.fetchedAt}
        rateRemaining={bundle.rateLimit?.remaining ?? null}
        onToggleSidebar={() => writeOpen(open ? "0" : "1")}
      />
      <div className="app-body">
        <div
          className={
            open
              ? "relative app-sidebar border-r border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-950/40"
              : "hidden"
          }
        >
          <Sidebar
            user={bundle.user}
            username={username}
            externalGroups={externalGroups}
            ownGroups={ownGroups}
            savedList={savedList}
          />
          <div
            role="separator"
            aria-orientation="vertical"
            onPointerDown={startResize}
            className="absolute right-[-3px] top-0 z-20 h-full w-1.5 cursor-col-resize hover:bg-blue-400/40"
          />
        </div>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
