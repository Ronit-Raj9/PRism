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
    <nav className="border-t border-neutral-200 px-2 py-1.5 dark:border-neutral-800">
      <ul className="space-y-0.5">
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
                  "flex items-center gap-2 rounded px-2 py-1.5 text-[13px] transition",
                  active
                    ? "bg-blue-100 font-medium text-blue-900 dark:bg-blue-900/40 dark:text-blue-200"
                    : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
                )}
              >
                <Icon size={14} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
