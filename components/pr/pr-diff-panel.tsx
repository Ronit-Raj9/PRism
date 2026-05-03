"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { html as diff2htmlHtml } from "diff2html";
import { ColorSchemeType } from "diff2html/lib/types";
import { FileWarning } from "lucide-react";
import type { PRFile, ReviewCommentNode } from "@/types/github";
import type { DisplayMode } from "./pr-toolbar";
import { isLikelyBinary } from "./binary";

interface Props {
  panelRef: React.RefObject<HTMLDivElement | null>;
  sectionRefs: React.RefObject<Map<string, HTMLDivElement>>;
  files: PRFile[];
  displayMode: DisplayMode;
  loading: boolean;
  error: string | null;
  viewed: Set<string>;
  onToggleViewed: (path: string) => void;
  reviewCommentsByPath: Map<string, ReviewCommentNode[]>;
  onActiveFileChange: (path: string | null) => void;
}

// Approximate skeleton height per file before it enters the viewport. Big
// enough that the user can't easily scroll past N unrendered files at once,
// small enough that we don't blow up the scrollbar.
const PLACEHOLDER_HEIGHT_PX = 320;

export function PRDiffPanel({
  panelRef,
  sectionRefs,
  files,
  displayMode,
  loading,
  error,
  viewed,
  onToggleViewed,
  reviewCommentsByPath,
  onActiveFileChange,
}: Props) {
  // Track which files are near the viewport so we render their diff. This is
  // what keeps a 39-file PR from slamming the renderer with thousands of
  // syntax-highlighted lines on first paint.
  const [renderedSet, setRenderedSet] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const scroller = panelRef.current;
    if (!scroller || files.length === 0) return;

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        let nextAdded: string[] | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const path = (e.target as HTMLElement).dataset.path;
          if (!path) continue;
          if (!nextAdded) nextAdded = [];
          nextAdded.push(path);
        }
        if (nextAdded && nextAdded.length > 0) {
          setRenderedSet((prev) => {
            let changed = false;
            const next = new Set(prev);
            for (const p of nextAdded!) {
              if (!next.has(p)) {
                next.add(p);
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        }
      },
      {
        root: scroller,
        // Render a screen ahead and a screen behind so quick scrolls feel
        // instant.
        rootMargin: "1200px 0px 1200px 0px",
        threshold: 0,
      },
    );

    const activeObserver = new IntersectionObserver(
      (entries) => {
        let bestPath: string | null = null;
        let bestTop = -Infinity;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const path = (e.target as HTMLElement).dataset.path;
          if (!path) continue;
          const top = e.boundingClientRect.top;
          if (top <= 1 && top > bestTop) {
            bestTop = top;
            bestPath = path;
          }
        }
        if (bestPath) onActiveFileChange(bestPath);
      },
      {
        root: scroller,
        rootMargin: "0px 0px -75% 0px",
        threshold: [0, 0.1],
      },
    );

    for (const path of sectionRefs.current?.keys() ?? []) {
      const el = sectionRefs.current?.get(path);
      if (el) {
        visibilityObserver.observe(el);
        activeObserver.observe(el);
      }
    }
    return () => {
      visibilityObserver.disconnect();
      activeObserver.disconnect();
    };
  }, [files, onActiveFileChange, panelRef, sectionRefs]);

  if (loading) {
    return (
      <div className="pr-diff p-4">
        <div className="space-y-2">
          <div className="h-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pr-diff p-4">
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          Failed to load diff: {error}
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="pr-diff p-4">
        <p className="text-sm italic text-neutral-500">
          No file changes match the current filter.
        </p>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="pr-diff">
      {files.map((f) => (
        <FileSection
          key={f.path}
          file={f}
          displayMode={displayMode}
          isViewed={viewed.has(f.path)}
          shouldRender={renderedSet.has(f.path)}
          onToggleViewed={() => onToggleViewed(f.path)}
          comments={reviewCommentsByPath.get(f.path) ?? []}
          register={(el) => {
            if (el) sectionRefs.current?.set(f.path, el);
            else sectionRefs.current?.delete(f.path);
          }}
        />
      ))}
    </div>
  );
}

function FileSection({
  file,
  displayMode,
  isViewed,
  shouldRender,
  onToggleViewed,
  comments,
  register,
}: {
  file: PRFile;
  displayMode: DisplayMode;
  isViewed: boolean;
  shouldRender: boolean;
  onToggleViewed: () => void;
  comments: ReviewCommentNode[];
  register: (el: HTMLDivElement | null) => void;
}) {
  const isBinary = useMemo(() => isLikelyBinary(file.path, file.patch), [
    file.path,
    file.patch,
  ]);

  return (
    <div
      ref={register}
      data-path={file.path}
      className="border-b border-neutral-200 dark:border-neutral-800"
    >
      <div className="pr-file-hdr flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] dark:border-neutral-800 dark:bg-neutral-900">
        <span className="truncate font-mono text-neutral-700 dark:text-neutral-300">
          {file.path}
        </span>
        {isBinary ? (
          <span className="shrink-0 rounded bg-neutral-200 px-1 py-0.5 text-[9px] font-medium uppercase text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            binary
          </span>
        ) : null}
        <span className="ml-auto flex shrink-0 items-center gap-2">
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
          <label className="flex cursor-pointer items-center gap-1 text-neutral-600 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={isViewed}
              onChange={onToggleViewed}
              className="h-3 w-3"
            />
            Viewed
          </label>
        </span>
      </div>
      {isViewed ? (
        <div className="bg-neutral-50 px-3 py-2 text-[11px] italic text-neutral-500 dark:bg-neutral-900/40">
          Marked as viewed. Uncheck to expand.
        </div>
      ) : isBinary ? (
        <BinaryNotice file={file} />
      ) : !shouldRender ? (
        <div
          className="flex items-center justify-center bg-neutral-50/50 text-[11px] italic text-neutral-400 dark:bg-neutral-900/20"
          style={{ minHeight: PLACEHOLDER_HEIGHT_PX }}
        >
          Loading diff…
        </div>
      ) : (
        <FileDiffBody file={file} displayMode={displayMode} />
      )}
      {comments.length > 0 && !isViewed ? (
        <div className="border-t border-neutral-200 bg-neutral-50/60 p-2 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="mb-1 text-[10px] font-medium text-neutral-500">
            {comments.length} review comment{comments.length === 1 ? "" : "s"}
          </div>
          <ul className="space-y-1">
            {comments.map((c, i) => (
              <li
                key={i}
                className="rounded border border-neutral-200 bg-white p-2 text-[11px] dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="mb-1 font-mono text-[9px] text-neutral-500">
                  {c.authorLogin ?? "unknown"}
                  {c.line ? ` · line ${c.line}` : ""}
                </div>
                <div className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                  {c.body}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function BinaryNotice({ file }: { file: PRFile }) {
  const filename = file.path.split("/").pop() ?? file.path;
  return (
    <div className="flex items-center gap-3 bg-neutral-50/60 px-3 py-4 text-[11.5px] text-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-400">
      <FileWarning size={14} className="shrink-0 text-amber-500" />
      <div>
        <div className="font-medium text-neutral-800 dark:text-neutral-200">
          {filename}
        </div>
        <div className="mt-0.5 text-neutral-500">
          Binary file —{" "}
          {file.status === "added"
            ? "added"
            : file.status === "removed"
              ? "removed"
              : "modified"}
          {file.additions || file.deletions
            ? ` (${file.additions || 0} add / ${file.deletions || 0} del bytes)`
            : ""}
          . Inline diff is not meaningful.
        </div>
      </div>
    </div>
  );
}

function FileDiffBody({
  file,
  displayMode,
}: {
  file: PRFile;
  displayMode: DisplayMode;
}) {
  const html = useMemo(() => {
    if (!file.patch) return null;
    const diffHeader = [
      `diff --git a/${file.path} b/${file.path}`,
      file.status === "added"
        ? `--- /dev/null\n+++ b/${file.path}`
        : file.status === "removed"
          ? `--- a/${file.path}\n+++ /dev/null`
          : `--- a/${file.path}\n+++ b/${file.path}`,
    ].join("\n");
    const fullDiff = `${diffHeader}\n${file.patch}`;
    return diff2htmlHtml(fullDiff, {
      drawFileList: false,
      matching: "lines",
      outputFormat: displayMode === "split" ? "side-by-side" : "line-by-line",
      colorScheme: ColorSchemeType.AUTO,
    });
  }, [file.path, file.patch, file.status, displayMode]);

  if (!html) {
    return (
      <div className="px-3 py-2 text-[11px] italic text-neutral-500">
        No diff available (file too large).
      </div>
    );
  }

  return (
    <div
      className={clsx("diff-container overflow-x-auto text-xs")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
