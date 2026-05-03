"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import clsx from "clsx";
import {
  ExternalLink,
  ChevronLeft,
  Plus as PlusIcon,
  Minus,
  ChevronRight,
} from "lucide-react";
import { html as diff2htmlHtml } from "diff2html";
import { ColorSchemeType } from "diff2html/lib/types";
import type { PRNode, PRFile, ReviewCommentNode } from "@/types/github";
import { MarkdownBody } from "@/components/markdown-body";
import { CommentList, ReviewList } from "@/components/comment-thread";
import { PRStatusBadge } from "@/components/pr-detail";

type Sub = "diff" | "description" | "discussion" | "reviews";

export function EditorPR({ pr }: { pr: PRNode }) {
  const [sub, setSub] = useState<Sub>("diff");
  const [owner, repo] = pr.repo.nameWithOwner.split("/");
  const reviewCommentCount = pr.reviews.reduce(
    (s, r) => s + r.comments.length,
    0,
  );
  const allReviewComments = pr.reviews.flatMap((r) => r.comments);

  // Sub-tab keyboard shortcuts: D/I/C/R when not typing in an input
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        tag === "INPUT" ||
        tag === "TEXTAREA"
      )
        return;
      if (e.key === "d" || e.key === "D") setSub("diff");
      else if (e.key === "i" || e.key === "I") setSub("description");
      else if (e.key === "c" || e.key === "C") setSub("discussion");
      else if (e.key === "r" || e.key === "R") setSub("reviews");
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Breadcrumb */}
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-neutral-100/60 px-4 py-1.5 text-[11px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
        <span>{owner}</span>
        <ChevronRight size={11} />
        <span>{repo}</span>
        <ChevronRight size={11} />
        <span>PR #{pr.number}</span>
        <ChevronRight size={11} />
        <span className="truncate text-neutral-700 dark:text-neutral-300">
          {pr.title}
        </span>
      </div>

      {/* Sticky header */}
      <div className="shrink-0 border-b border-neutral-200 bg-neutral-50 px-5 pt-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-wrap items-baseline gap-3">
          <PRStatusBadge pr={pr} />
          <h1 className="text-base font-semibold">{pr.title}</h1>
          <span className="ml-auto text-xs text-neutral-500">
            {pr.mergedAt
              ? `Merged ${format(parseISO(pr.mergedAt), "MMM d, yyyy")}`
              : `Opened ${format(parseISO(pr.createdAt), "MMM d, yyyy")}`}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="text-emerald-600 dark:text-emerald-400">
            +{pr.additions.toLocaleString()} lines
          </span>
          <span className="text-rose-600 dark:text-rose-400">
            −{pr.deletions.toLocaleString()} lines
          </span>
          <span>{pr.changedFiles} files</span>
          <span>{pr.comments.length} comments</span>
          <a
            href={pr.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
          >
            Open on GitHub
            <ExternalLink size={11} />
          </a>
        </div>

        <div className="mt-3 flex gap-1 border-b border-transparent">
          {(
            [
              { id: "diff", label: "Diff", count: pr.changedFiles },
              { id: "description", label: "Description" },
              { id: "discussion", label: "Discussion", count: pr.comments.length },
              {
                id: "reviews",
                label: "Reviews",
                count: pr.reviews.length + reviewCommentCount,
              },
            ] as { id: Sub; label: string; count?: number }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              className={clsx(
                "border-b-2 px-3 py-2 text-xs font-medium transition",
                sub === t.id
                  ? "border-blue-500 text-neutral-900 dark:text-neutral-100"
                  : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
              )}
            >
              {t.label}
              {t.count !== undefined ? (
                <span className="ml-1.5 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {sub === "diff" ? (
          <DiffWithFileTree
            key={`${owner}/${repo}#${pr.number}`}
            owner={owner}
            repo={repo}
            prNumber={pr.number}
            reviewComments={allReviewComments}
          />
        ) : null}
        {sub === "description" ? (
          <div className="h-full overflow-auto p-5">
            <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <MarkdownBody body={pr.body} />
            </div>
          </div>
        ) : null}
        {sub === "discussion" ? (
          <div className="h-full overflow-auto p-5">
            {pr.comments.length > 0 ? (
              <CommentList comments={pr.comments} />
            ) : (
              <p className="text-sm italic text-neutral-500">
                No discussion comments.
              </p>
            )}
          </div>
        ) : null}
        {sub === "reviews" ? (
          <div className="h-full overflow-auto p-5">
            {pr.reviews.length > 0 ? (
              <ReviewList reviews={pr.reviews} />
            ) : (
              <p className="text-sm italic text-neutral-500">No reviews.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DiffWithFileTree({
  owner,
  repo,
  prNumber,
  reviewComments,
}: {
  owner: string;
  repo: string;
  prNumber: number;
  reviewComments: ReviewCommentNode[];
}) {
  const [files, setFiles] = useState<PRFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "added" | "removed">("all");
  const [treeOpen, setTreeOpen] = useState(true);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLDivElement>());

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
        if (!cancelled) {
          setFiles(j.files);
          if (j.files[0]) setActiveFile(j.files[0].path);
        }
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

  const visible = useMemo(() => {
    if (!files) return null;
    if (filter === "added")
      return files.filter((f) => f.status === "added" || f.additions > 0);
    if (filter === "removed")
      return files.filter((f) => f.status === "removed" || f.deletions > 0);
    return files;
  }, [files, filter]);

  const commentsByPath = useMemo(() => {
    const m = new Map<string, ReviewCommentNode[]>();
    for (const c of reviewComments) {
      if (!c.path) continue;
      const arr = m.get(c.path) ?? [];
      arr.push(c);
      m.set(c.path, arr);
    }
    return m;
  }, [reviewComments]);

  // Track active file by scroll position
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    function onScroll() {
      const scrollTop = root!.scrollTop;
      let current: string | null = null;
      for (const [path, el] of sectionRefs.current) {
        if (el.offsetTop - 100 <= scrollTop) current = path;
      }
      if (current) setActiveFile(current);
    }
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [files]);

  function jumpTo(path: string) {
    const el = sectionRefs.current.get(path);
    const root = scrollRef.current;
    if (!el || !root) return;
    root.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
    setActiveFile(path);
  }

  if (loading) {
    return (
      <div className="space-y-2 p-5">
        <div className="h-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="m-5 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
        Failed to load diff: {error}
      </div>
    );
  }
  if (!files || files.length === 0 || !visible) {
    return (
      <div className="m-5 rounded-md border border-neutral-200 bg-white p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        No file changes found.
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 overflow-hidden" style={{ gridTemplateColumns: treeOpen ? "220px 1fr" : "28px 1fr" }}>
      {/* File tree */}
      <div className="flex min-h-0 flex-col border-r border-neutral-200 bg-neutral-100/40 dark:border-neutral-800 dark:bg-neutral-900/40">
        <div className="flex shrink-0 items-center gap-1 border-b border-neutral-200 px-2 py-1 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setTreeOpen((o) => !o)}
            title={treeOpen ? "Collapse" : "Expand"}
            className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            {treeOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
          </button>
          {treeOpen ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Files · {visible.length}
            </span>
          ) : null}
        </div>
        {treeOpen ? (
          <>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-auto py-1 text-xs">
              {visible.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => jumpTo(f.path)}
                  className={clsx(
                    "flex w-full items-center gap-2 px-2 py-1 text-left transition",
                    activeFile === f.path
                      ? "bg-blue-100 text-neutral-900 dark:bg-blue-900/40 dark:text-neutral-100"
                      : "text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800/60",
                    !f.patch && "opacity-50",
                  )}
                  disabled={!f.patch}
                  title={f.path}
                >
                  <span className="flex-1 truncate font-mono text-[11px]">
                    {basename(f.path)}
                  </span>
                  <FileBadge file={f} />
                </button>
              ))}
            </div>
            <div className="shrink-0 border-t border-neutral-200 p-2 dark:border-neutral-800">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                Jump to
              </div>
              <div className="mt-1 flex gap-1">
                <button
                  onClick={() => setFilter("all")}
                  className={clsx(
                    "rounded px-1.5 py-0.5 text-[10px] transition",
                    filter === "all"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("added")}
                  className={clsx(
                    "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] transition",
                    filter === "added"
                      ? "bg-emerald-500 text-white"
                      : "text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40",
                  )}
                >
                  <PlusIcon size={9} /> only
                </button>
                <button
                  onClick={() => setFilter("removed")}
                  className={clsx(
                    "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] transition",
                    filter === "removed"
                      ? "bg-rose-500 text-white"
                      : "text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-900/40",
                  )}
                >
                  <Minus size={9} /> only
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Diff */}
      <div
        ref={scrollRef}
        className="scrollbar-thin min-h-0 overflow-auto bg-neutral-50 p-4 dark:bg-neutral-950"
      >
        <div className="space-y-3">
          {visible.map((f) => (
            <div
              key={f.path}
              ref={(el) => {
                if (el) sectionRefs.current.set(f.path, el);
                else sectionRefs.current.delete(f.path);
              }}
            >
              <FileDiff
                file={f}
                comments={commentsByPath.get(f.path) ?? []}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FileBadge({ file }: { file: PRFile }) {
  if (!file.patch) {
    return (
      <span className="text-[9px] uppercase text-neutral-500">bin</span>
    );
  }
  return (
    <span className="flex shrink-0 gap-0.5 text-[10px]">
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
      <div className="rounded-md border border-neutral-200 bg-white p-3 text-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="font-mono text-neutral-700 dark:text-neutral-300">
          {file.path}
        </div>
        <div className="mt-1 text-neutral-500">
          No diff (binary or too large).
        </div>
      </div>
    );
  }

  const diffHeader = [
    `diff --git a/${file.path} b/${file.path}`,
    file.status === "added"
      ? `--- /dev/null\n+++ b/${file.path}`
      : file.status === "removed"
        ? `--- a/${file.path}\n+++ /dev/null`
        : `--- a/${file.path}\n+++ b/${file.path}`,
  ].join("\n");
  const html = diff2htmlHtml(`${diffHeader}\n${file.patch}`, {
    drawFileList: false,
    matching: "lines",
    outputFormat: "line-by-line",
    colorScheme: ColorSchemeType.AUTO,
  });

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50/95 px-3 py-1.5 text-xs backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
        <span className="truncate font-mono text-neutral-700 dark:text-neutral-300">
          {file.path}
        </span>
        <span className="flex shrink-0 gap-2">
          <span className="text-emerald-600 dark:text-emerald-400">
            +{file.additions}
          </span>
          <span className="text-rose-600 dark:text-rose-400">
            −{file.deletions}
          </span>
        </span>
      </div>
      <div
        className="diff-container overflow-x-auto text-xs"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {comments.length > 0 ? (
        <div className="border-t border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {comments.length} review comment{comments.length === 1 ? "" : "s"}
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

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}
