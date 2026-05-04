"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { GitPullRequest, Moon, PanelLeft, Scale, Sun } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { SaveButton } from "@/components/save-button";

interface Props {
  username: string;
  initiallySaved: boolean;
  cacheState: "fresh" | "stale" | "miss";
  fetchedAt: string;
  rateRemaining: number | null;
  onToggleSidebar: () => void;
}

export function TopBar({
  username,
  initiallySaved,
  cacheState,
  fetchedAt,
  rateRemaining,
  onToggleSidebar,
}: Props) {
  return (
    <header className="z-30 flex h-12 shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-950">
      <button
        onClick={onToggleSidebar}
        title="Toggle sidebar (B)"
        className="rounded p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        <PanelLeft size={16} />
      </button>
      <Link
        href="/"
        className="mr-1 flex items-center gap-1.5 text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
      >
        <GitPullRequest size={14} className="text-violet-500" />
        GitScope
      </Link>
      <div data-topbar-search className="flex-1 max-w-xl">
        <SearchBar initial={username} />
      </div>
      <CacheChip
        state={cacheState}
        fetchedAt={fetchedAt}
        rateRemaining={rateRemaining}
      />
      <Link
        href={`/compare?u=${encodeURIComponent(username)}`}
        title="Compare profiles"
        className="hidden items-center gap-1 rounded p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 md:inline-flex dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        <Scale size={14} />
        <span className="text-[11px] font-medium">Compare</span>
      </Link>
      <SaveButton username={username} initialSaved={initiallySaved} />
      <ThemeToggle />
    </header>
  );
}

function CacheChip({
  state,
  fetchedAt,
  rateRemaining,
}: {
  state: "fresh" | "stale" | "miss";
  fetchedAt: string;
  rateRemaining: number | null;
}) {
  const cls =
    state === "fresh"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : state === "stale"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
        : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
  const dot =
    state === "fresh"
      ? "bg-emerald-500"
      : state === "stale"
        ? "bg-amber-500"
        : "bg-blue-500";
  const label = state === "fresh" ? "Fresh" : state === "stale" ? "Stale" : "Live";
  const title =
    `Fetched ${fetchedAt}` +
    (rateRemaining !== null ? ` · GitHub rate limit: ${rateRemaining}` : "");
  return (
    <span
      title={title}
      className={`hidden items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium md:inline-flex ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function subscribeDark(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => obs.disconnect();
}

function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribeDark,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  function toggle() {
    const next = !dark;
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    try {
      localStorage.setItem("gitscope-theme", next ? "dark" : "light");
    } catch {}
  }
  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light" : "Switch to dark"}
      className="rounded p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
