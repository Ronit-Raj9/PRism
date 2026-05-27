"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Moon, PanelLeft, Scale, Sun } from "lucide-react";
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
    <header className="z-30 flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/90 px-3 backdrop-blur-md dark:bg-[var(--surface)]/85">
      <button
        onClick={onToggleSidebar}
        title="Toggle sidebar (B)"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      >
        <PanelLeft size={18} strokeWidth={1.75} />
      </button>
      <Link
        href="/"
        className="hidden shrink-0 text-sm font-semibold tracking-tight text-[var(--foreground)] sm:block"
      >
        GitGambit
      </Link>
      <div data-topbar-search className="min-w-0 flex-1">
        <SearchBar initial={username} variant="shell" />
      </div>
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <CacheChip
          state={cacheState}
          fetchedAt={fetchedAt}
          rateRemaining={rateRemaining}
        />
        <Link
          href={`/compare?u=${encodeURIComponent(username)}`}
          title="Compare profiles"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          <Scale size={17} strokeWidth={1.75} />
        </Link>
        <SaveButton username={username} initialSaved={initiallySaved} />
        <ThemeToggle />
      </div>
      <div className="flex shrink-0 items-center gap-0.5 md:hidden">
        <SaveButton username={username} initialSaved={initiallySaved} compact />
        <ThemeToggle />
      </div>
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
  const dot =
    state === "fresh"
      ? "bg-emerald-500"
      : state === "stale"
        ? "bg-amber-500"
        : "bg-sky-500";
  const label = state === "fresh" ? "Fresh" : state === "stale" ? "Stale" : "Live";
  const title =
    `${label} · Fetched ${fetchedAt}` +
    (rateRemaining !== null ? ` · API: ${rateRemaining}` : "");
  return (
    <span
      title={title}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 text-[11px] font-medium text-[var(--muted)]"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span className="hidden lg:inline">{label}</span>
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
      localStorage.setItem("gitgambit-theme", next ? "dark" : "light");
    } catch {}
  }
  return (
    <button
      onClick={toggle}
      title={dark ? "Light mode" : "Dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
    >
      {dark ? <Sun size={17} strokeWidth={1.75} /> : <Moon size={17} strokeWidth={1.75} />}
    </button>
  );
}
