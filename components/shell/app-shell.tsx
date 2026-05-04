"use client";

import { useEffect, useMemo } from "react";
import type { UserProfile } from "@/types/github";
import type { SavedItem } from "@/components/saved-switcher";
import { TopBar } from "./top-bar";
import { Sidebar } from "./sidebar";
import type { RepoTreeGroup } from "./repo-tree";
import { useStoredValue } from "./use-stored-value";

const SIDEBAR_WIDTH_KEY = "gitscope-sidebar-w";
const SIDEBAR_OPEN_KEY = "gitscope-sidebar-open";
const DEFAULT_W = 280;
const MIN_W = 200;
const MAX_W = 480;

interface Props {
  user: UserProfile;
  username: string;
  cacheState: "fresh" | "stale" | "miss";
  fetchedAt: string;
  rateRemaining: number | null;
  externalGroups: RepoTreeGroup[];
  ownGroups: RepoTreeGroup[];
  savedList: SavedItem[];
  initiallySaved: boolean;
  children: React.ReactNode;
}

export function AppShell({
  user,
  username,
  cacheState,
  fetchedAt,
  rateRemaining,
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
        initiallySaved={initiallySaved}
        cacheState={cacheState}
        fetchedAt={fetchedAt}
        rateRemaining={rateRemaining}
        onToggleSidebar={() => writeOpen(open ? "0" : "1")}
      />
      <div className="app-body">
        <div
          className={
            open
              ? "relative flex h-full min-h-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] dark:bg-[var(--surface)]"
              : "hidden"
          }
        >
          <div className="app-sidebar scrollbar-thin relative z-10 min-h-0 flex-1">
            <Sidebar
              user={user}
              username={username}
              externalGroups={externalGroups}
              ownGroups={ownGroups}
              savedList={savedList}
            />
          </div>
          {/* Narrow hit target so repo-row clicks are not stolen by the resize strip */}
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-2 justify-end">
            <div
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize sidebar"
              onPointerDown={startResize}
              className="pointer-events-auto w-1.5 shrink-0 cursor-col-resize touch-none hover:bg-indigo-400/25"
            />
          </div>
        </div>
        <main className="app-main bg-[var(--background)]">{children}</main>
      </div>
    </div>
  );
}
