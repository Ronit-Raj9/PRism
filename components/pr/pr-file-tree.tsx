"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import type { PRFile } from "@/types/github";
import {
  buildPathTree,
  pathDirPrefixes,
  type PrDirNode,
} from "./pr-path-tree";

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
  const tree = useMemo(() => buildPathTree(files), [files]);
  /** Collapsed folder prefixes; empty set = all folders expanded. */
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(
    () => new Set(),
  );

  const q = filter.trim();
  useEffect(() => {
    if (files.length === 0) return;
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      for (const f of files) {
        for (const p of pathDirPrefixes(f.path)) next.delete(p);
      }
      return next;
    });
  }, [q, files]);

  useEffect(() => {
    if (!activeFile) return;
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      for (const p of pathDirPrefixes(activeFile)) next.delete(p);
      return next;
    });
  }, [activeFile]);

  const toggleDir = (prefix: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  };

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
          {filter.trim()
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
            {filter.trim()
              ? "No files match this filter."
              : "No file changes."}
          </li>
        ) : (
          <TreeNodes
            node={tree}
            depth={0}
            collapsedDirs={collapsedDirs}
            toggleDir={toggleDir}
            viewed={viewed}
            onToggleViewed={onToggleViewed}
            activeFile={activeFile}
            onSelect={onSelect}
          />
        )}
      </ul>
    </div>
  );
}

function TreeNodes({
  node,
  depth,
  collapsedDirs,
  toggleDir,
  viewed,
  onToggleViewed,
  activeFile,
  onSelect,
}: {
  node: PrDirNode;
  depth: number;
  collapsedDirs: Set<string>;
  toggleDir: (prefix: string) => void;
  viewed: Set<string>;
  onToggleViewed: (path: string) => void;
  activeFile: string | null;
  onSelect: (path: string) => void;
}) {
  return (
    <>
      {node.subdirs.map((sub) => {
        const folded = collapsedDirs.has(sub.prefix);
        return (
          <Fragment key={sub.prefix}>
            <li>
              <div
                className="flex items-center gap-0.5 text-[11px]"
                style={{ paddingLeft: depth * 12 + 4 }}
              >
                <button
                  type="button"
                  aria-expanded={!folded}
                  title={folded ? "Expand folder" : "Collapse folder"}
                  onClick={() => toggleDir(sub.prefix)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleDir(sub.prefix);
                    }
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:outline-none dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                >
                  {folded ? (
                    <ChevronRight size={14} strokeWidth={2} aria-hidden />
                  ) : (
                    <ChevronDown size={14} strokeWidth={2} aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => toggleDir(sub.prefix)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleDir(sub.prefix);
                    }
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded py-0.5 pr-2 text-left focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:outline-none"
                >
                  <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">
                    {sub.name}
                  </span>
                  <span className="pointer-events-none ml-auto flex shrink-0 gap-1 text-[10px] tabular-nums text-neutral-500">
                    {sub.additions > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{sub.additions}
                      </span>
                    ) : null}
                    {sub.deletions > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        −{sub.deletions}
                      </span>
                    ) : null}
                  </span>
                </button>
              </div>
            </li>
            {!folded ? (
              <TreeNodes
                node={sub}
                depth={depth + 1}
                collapsedDirs={collapsedDirs}
                toggleDir={toggleDir}
                viewed={viewed}
                onToggleViewed={onToggleViewed}
                activeFile={activeFile}
                onSelect={onSelect}
              />
            ) : null}
          </Fragment>
        );
      })}
      {node.files.map((f) => (
        <FileRow
          key={f.path}
          file={f}
          depth={depth}
          active={activeFile === f.path}
          isViewed={viewed.has(f.path)}
          onToggleViewed={onToggleViewed}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function FileRow({
  file,
  depth,
  active,
  isViewed,
  onToggleViewed,
  onSelect,
}: {
  file: PRFile;
  depth: number;
  active: boolean;
  isViewed: boolean;
  onToggleViewed: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const filename = file.path.split("/").pop() ?? file.path;
  const pad = depth * 12 + 4 + 28;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        title={file.path}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("input")) return;
          onSelect(file.path);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if ((e.target as HTMLElement).closest("input")) return;
            e.preventDefault();
            onSelect(file.path);
          }
        }}
        style={{ paddingLeft: pad }}
        className={clsx(
          "group flex cursor-pointer items-center gap-1.5 border-l-2 py-1 pr-2 text-[11px] transition outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
          active
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
          isViewed && "opacity-60",
        )}
      >
        <input
          type="checkbox"
          checked={isViewed}
          onChange={() => onToggleViewed(file.path)}
          title="Mark as viewed (V)"
          className="h-3 w-3 shrink-0 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="min-w-0 flex-1 text-left">
          <span
            className={clsx(
              "truncate font-mono",
              isViewed && "line-through",
            )}
          >
            {filename}
          </span>
        </div>
        <span className="pointer-events-none ml-auto flex shrink-0 gap-1 text-[10px] tabular-nums">
          {file.additions > 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              +{file.additions}
            </span>
          ) : null}
          {file.deletions > 0 ? (
            <span className="text-rose-600 dark:text-rose-400">
              −{file.deletions}
            </span>
          ) : null}
        </span>
      </div>
    </li>
  );
}
