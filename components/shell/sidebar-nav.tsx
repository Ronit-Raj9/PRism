"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Home,
  Activity,
  BarChart2,
  Search,
  type LucideIcon,
} from "lucide-react";

interface Props {
  username: string;
}

const ITEMS: { id: string; label: string; href: (u: string) => string; Icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", href: (u) => `/u/${u}`, Icon: Home },
  { id: "timeline", label: "Timeline", href: (u) => `/u/${u}/timeline`, Icon: Activity },
  { id: "insights", label: "Insights", href: (u) => `/u/${u}/insights`, Icon: BarChart2 },
  { id: "search", label: "Search", href: (u) => `/u/${u}/search`, Icon: Search },
];

export function SidebarNav({ username }: Props) {
  const pathname = usePathname() ?? "";
  const base = `/u/${username}`;

  return (
    <nav className="px-3 pb-2 pt-1">
      <ul className="flex flex-col gap-0.5">
        {ITEMS.map(({ id, label, href, Icon }) => {
          const target = href(username);
          const active =
            id === "overview"
              ? pathname === base
              : pathname === target || pathname.startsWith(`${target}/`);
          return (
            <li key={id}>
              <Link
                href={target}
                className={clsx(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon size={16} strokeWidth={1.75} className="shrink-0 opacity-90" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
