import Link from "next/link";
import { SearchBar } from "./search-bar";
import { SavedSwitcher, type SavedItem } from "./saved-switcher";
import type { SavedUser } from "@/lib/saved";

export function SiteHeader({
  initial,
  savedList,
}: {
  initial?: string;
  savedList?: SavedUser[];
}) {
  const items: SavedItem[] = (savedList ?? []).map((s) => ({
    username: s.username,
    label: s.label,
    note: s.note,
    lastVisitedAt: s.lastVisitedAt,
  }));

  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          GitScope
        </Link>
        <div className="flex-1">
          <SearchBar initial={initial} />
        </div>
        <SavedSwitcher items={items} />
      </div>
    </header>
  );
}
