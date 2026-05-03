"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { html as diff2htmlHtml } from "diff2html";
import { ColorSchemeType } from "diff2html/lib/types";
import type { PRFile, ReviewCommentNode } from "@/types/github";
import type { DisplayMode } from "./pr-toolbar";

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
  // IntersectionObserver tracks which file is currently most visible so the
  // file tree can highlight it and ◀▶ knows where to start.
  useEffect(() => {
    const scroller = panelRef.current;
    if (!scroller || files.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry whose top is closest to (just below) the scroller's
        // top edge.
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
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
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
  onToggleViewed,
  comments,
  register,
}: {
  file: PRFile;
  displayMode: DisplayMode;
  isViewed: boolean;
  onToggleViewed: () => void;
  comments: ReviewCommentNode[];
  register: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={register} data-path={file.path} className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="pr-file-hdr flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] dark:border-neutral-800 dark:bg-neutral-900">
        <span className="truncate font-mono text-neutral-700 dark:text-neutral-300">
          {file.path}
        </span>
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

function FileDiffBody({
  file,
  displayMode,
}: {
  file: PRFile;
  displayMode: DisplayMode;
}) {
  if (!file.patch) {
    return (
      <div className="px-3 py-2 text-[11px] italic text-neutral-500">
        No diff available (binary file or too large).
      </div>
    );
  }

  // diff2html needs a complete unified-diff header; PR file API gives only
  // the hunk patch, so synthesise minimal "diff --git" + index lines.
  const diffHeader = [
    `diff --git a/${file.path} b/${file.path}`,
    file.status === "added"
      ? `--- /dev/null\n+++ b/${file.path}`
      : file.status === "removed"
        ? `--- a/${file.path}\n+++ /dev/null`
        : `--- a/${file.path}\n+++ b/${file.path}`,
  ].join("\n");
  const fullDiff = `${diffHeader}\n${file.patch}`;

  const html = diff2htmlHtml(fullDiff, {
    drawFileList: false,
    matching: "lines",
    outputFormat: displayMode === "split" ? "side-by-side" : "line-by-line",
    colorScheme: ColorSchemeType.AUTO,
  });

  return (
    <div
      className={clsx("diff-container overflow-x-auto text-xs")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
