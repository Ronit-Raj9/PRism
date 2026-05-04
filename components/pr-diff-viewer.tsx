"use client";

import { useEffect, useState } from "react";
import { html as diff2htmlHtml } from "diff2html";
import { ColorSchemeType } from "diff2html/lib/types";
import type { PRFile } from "@/types/github";
import type { ReviewCommentNode } from "@/types/github";

interface Props {
  owner: string;
  repo: string;
  prNumber: number;
  reviewComments?: ReviewCommentNode[];
}

export function PRDiffViewer({ owner, repo, prNumber, reviewComments = [] }: Props) {
  const [files, setFiles] = useState<PRFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/pr-diff/${owner}/${repo}/${prNumber}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        return r.json() as Promise<{ files: PRFile[] }>;
      })
      .then((j) => {
        if (!cancelled) setFiles(j.files);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [owner, repo, prNumber]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
        Failed to load diff: {error}
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        No file changes found for this PR.
      </div>
    );
  }

  // Group review comments by file path
  const commentsByPath = new Map<string, ReviewCommentNode[]>();
  for (const c of reviewComments) {
    if (!c.path) continue;
    const arr = commentsByPath.get(c.path) ?? [];
    arr.push(c);
    commentsByPath.set(c.path, arr);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400">
        <span>{files.length} files changed</span>
        <span className="text-emerald-700 dark:text-emerald-400">
          +{files.reduce((s, f) => s + f.additions, 0)}
        </span>
        <span className="text-rose-700 dark:text-rose-400">
          −{files.reduce((s, f) => s + f.deletions, 0)}
        </span>
      </div>
      {files.map((f) => (
        <FileDiff
          key={f.path}
          file={f}
          comments={commentsByPath.get(f.path) ?? []}
        />
      ))}
    </div>
  );
}

function FileDiff({
  file,
  comments,
}: {
  file: PRFile;
  comments: ReviewCommentNode[];
}) {
  if (!file.patch) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
          {file.path}
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          No diff available (binary file or too large).
        </div>
      </div>
    );
  }

  // diff2html needs a complete unified-diff header; PR file API gives only the
  // hunk patch, so synthesise minimal "diff --git" + index lines around it.
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
    outputFormat: "line-by-line",
    colorScheme: ColorSchemeType.AUTO,
  });

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-800 dark:bg-neutral-900">
        <span className="truncate font-mono text-neutral-700 dark:text-neutral-300">
          {file.path}
        </span>
        <span className="flex shrink-0 gap-2">
          <span className="text-emerald-700 dark:text-emerald-400">+{file.additions}</span>
          <span className="text-rose-700 dark:text-rose-400">−{file.deletions}</span>
        </span>
      </div>
      <div
        className="diff-container overflow-x-auto text-xs"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {comments.length > 0 ? (
        <div className="border-t border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {comments.length} review comment{comments.length === 1 ? "" : "s"} on this file
          </div>
          <div className="space-y-2">
            {comments.map((c, i) => (
              <div
                key={i}
                className="rounded border border-neutral-200 bg-white p-2 text-xs dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="mb-1 font-mono text-[10px] text-neutral-500">
                  {c.authorLogin ?? "unknown"}
                  {c.line ? ` · line ${c.line}` : ""}
                </div>
                <div className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                  {c.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
