"use client";

import clsx from "clsx";
import { Search } from "lucide-react";
import type { PRFile } from "@/types/github";

interface Props {
  inputRef: React.RefObject<HTMLInputElement | null>;
  filter: string;
  setFilter: (s: string) => void;
  files: PRFile[];
  allFilesCount: number;
  viewed: Set<string>;
  onToggleViewed: (path: string) => void;
  activeFile: string | null;
  onSelect: (path: string) => void;
  loading: boolean;
}

export function PRFileTree({
  inputRef,
  filter,
  setFilter,
  files,
  allFilesCount,
  viewed,
  onToggleViewed,
  activeFile,
  onSelect,
  loading,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 p-2 dark:border-neutral-800">
        <div className="relative">
          <Search
            size={11}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files (/)…"
            className="w-full rounded border border-neutral-300 bg-white py-1 pl-6 pr-2 text-[11px] outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div className="mt-1 px-1 text-[10px] text-neutral-500">
          {filter
            ? `${files.length} of ${allFilesCount}`
            : `${allFilesCount} file${allFilesCount === 1 ? "" : "s"}`}
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <li className="px-3 py-1.5 text-[11px] italic text-neutral-500">
            Loading files…
          </li>
        ) : files.length === 0 ? (
          <li className="px-3 py-1.5 text-[11px] italic text-neutral-500">
            {filter ? "No files match this filter." : "No file changes."}
          </li>
        ) : (
          files.map((f) => {
            const active = activeFile === f.path;
            const isViewed = viewed.has(f.path);
            const filename = f.path.split("/").pop() ?? f.path;
            const dir = f.path.slice(0, f.path.length - filename.length);
            return (
              <li key={f.path}>
                <div
                  className={clsx(
                    "group flex items-center gap-1.5 border-l-2 px-2 py-1 text-[11px] transition",
                    active
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
                    isViewed && "opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isViewed}
                    onChange={() => onToggleViewed(f.path)}
                    title="Mark as viewed (V)"
                    className="h-3 w-3 shrink-0 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={() => onSelect(f.path)}
                    className="min-w-0 flex-1 text-left"
                    title={f.path}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className={clsx(
                          "truncate font-mono",
                          isViewed && "line-through",
                        )}
                      >
                        {filename}
                      </span>
                    </div>
                    {dir ? (
                      <div className="truncate font-mono text-[9px] text-neutral-500">
                        {dir}
                      </div>
                    ) : null}
                  </button>
                  <span className="ml-auto flex shrink-0 gap-1 text-[10px] tabular-nums">
                    {f.additions > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{f.additions}
                      </span>
                    ) : null}
                    {f.deletions > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        −{f.deletions}
                      </span>
                    ) : null}
                  </span>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
