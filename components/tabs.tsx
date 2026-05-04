"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";

export interface TabDef {
  id: string;
  label: string;
  badge?: string | number;
  content: ReactNode;
}

export function Tabs({ tabs, defaultTab }: { tabs: TabDef[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  return (
    <div>
      <div
        role="tablist"
        className="sticky top-0 z-10 -mx-6 flex gap-1 overflow-x-auto border-b border-neutral-200 bg-neutral-50/95 px-6 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={clsx(
              "relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition",
              active === t.id
                ? "text-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
            )}
          >
            {t.label}
            {t.badge !== undefined ? (
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs",
                  active === t.id
                    ? "bg-neutral-900 text-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
                )}
              >
                {t.badge}
              </span>
            ) : null}
            {active === t.id ? (
              <span className="absolute inset-x-3 -bottom-px h-0.5 bg-neutral-900 dark:bg-neutral-100" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="py-6">
        {tabs.map((t) => (
          <div key={t.id} role="tabpanel" hidden={active !== t.id}>
            {active === t.id ? t.content : null}
          </div>
        ))}
      </div>
    </div>
  );
}
