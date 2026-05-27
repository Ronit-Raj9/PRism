"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PRFile, PRNode, PRState, ReviewCommentNode } from "@/types/github";
import { CommentList, ReviewList } from "@/components/comment-thread";
import { MarkdownBody } from "@/components/markdown-body";
import { useStoredValue } from "@/components/shell/use-stored-value";
import { PRHeader } from "./pr-header";
import { PRTabs, type PRSubTab } from "./pr-tabs";
import { PRToolbar, type DisplayMode } from "./pr-toolbar";
import { PRFileTree } from "./pr-file-tree";
import { PRDiffPanel } from "./pr-diff-panel";
import { useSessionSet } from "./use-session-set";

export interface PRNeighbour {
  repo: string;
  number: number;
  title: string;
  state: PRState;
}

interface Props {
  pr: PRNode;
  username: string;
  prev: PRNeighbour | null;
  next: PRNeighbour | null;
}

export function PRView({ pr, username, prev, next }: Props) {
  const [owner, repoName] = pr.repo.nameWithOwner.split("/");
  const [sub, setSub] = useState<PRSubTab>("files");
  const [displayPref, writeDisplay] = useStoredValue("gitgambit-display-mode");
  const displayMode: DisplayMode = displayPref === "split" ? "split" : "unified";
  const [filter, setFilter] = useState("");
  const filterInputRef = useRef<HTMLInputElement>(null);
  const diffPanelRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLDivElement>());
  const suspendActiveObserver = useRef(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const viewedKey = `gitgambit-viewed:${pr.repo.nameWithOwner}#${pr.number}`;
  const [viewed, writeViewed] = useSessionSet(viewedKey);
  const collapsedKey = `gitgambit-diff-collapsed:${pr.repo.nameWithOwner}#${pr.number}`;
  const [collapsedPaths, writeCollapsed] = useSessionSet(collapsedKey);

  // Diff state, keyed by `${owner}/${repo}#${number}`. Resetting on PR change
  // happens via the derived-state-during-render pattern (see below) so we
  // never call setState synchronously inside the fetch effect.
  const prKey = `${owner}/${repoName}#${pr.number}`;
  const [diffState, setDiffState] = useState<{
    key: string;
    files: PRFile[] | null;
    error: string | null;
    loading: boolean;
  }>({ key: prKey, files: null, error: null, loading: true });

  if (diffState.key !== prKey) {
    setDiffState({ key: prKey, files: null, error: null, loading: true });
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/pr-diff/${owner}/${repoName}/${pr.number}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        return r.json() as Promise<{ files: PRFile[] }>;
      })
      .then((j) => {
        if (cancelled) return;
        setDiffState((prev) =>
          prev.key === prKey
            ? { ...prev, files: j.files, loading: false }
            : prev,
        );
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setDiffState((prev) =>
          prev.key === prKey
            ? { ...prev, error: e.message, loading: false }
            : prev,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [owner, repoName, pr.number, prKey]);

  const files = diffState.files;
  const filesError = diffState.error;
  const filesLoading = diffState.loading;

  const filteredFiles = useMemo(() => {
    if (!files) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.path.toLowerCase().includes(q));
  }, [files, filter]);

  // Highlight first file once list loads (sidebar + observer need a baseline).
  useEffect(() => {
    if (filteredFiles.length === 0) return;
    setActiveFile((prev) => (prev && filteredFiles.some((f) => f.path === prev) ? prev : filteredFiles[0].path));
  }, [filteredFiles]);

  const reviewCommentsByPath = useMemo(() => {
    const m = new Map<string, ReviewCommentNode[]>();
    for (const r of pr.reviews) {
      for (const c of r.comments) {
        if (!c.path) continue;
        const arr = m.get(c.path) ?? [];
        arr.push(c);
        m.set(c.path, arr);
      }
    }
    return m;
  }, [pr.reviews]);

  const toggleCollapsedPath = useCallback(
    (path: string) => {
      const next = new Set(collapsedPaths);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      writeCollapsed(next);
    },
    [collapsedPaths, writeCollapsed],
  );

  /** Alt/Option+click chevron: collapse all if any expanded, else expand all (GitHub-style). */
  const altCollapseAllToggle = useCallback(() => {
    const paths = filteredFiles.map((f) => f.path);
    if (paths.length === 0) return;
    const anyExpanded = paths.some((p) => !collapsedPaths.has(p));
    if (anyExpanded) {
      writeCollapsed(new Set(paths));
    } else {
      writeCollapsed(new Set());
    }
  }, [collapsedPaths, filteredFiles, writeCollapsed]);

  // Scroll the diff panel to a file. Uses geometry vs. offsetTop so nested /
  // sticky layout does not break navigation (file tree + [ ] shortcuts).
  const scrollToFile = useCallback(
    (path: string) => {
      const nextCollapsed = new Set(collapsedPaths);
      nextCollapsed.delete(path);
      if (nextCollapsed.size !== collapsedPaths.size) {
        writeCollapsed(nextCollapsed);
      }
      const el = sectionRefs.current.get(path);
      const scroller = diffPanelRef.current;
      if (!el || !scroller) return;
      suspendActiveObserver.current = true;
      setActiveFile(path);
      const scRect = scroller.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const nextTop = scroller.scrollTop + (elRect.top - scRect.top) - 4;
      scroller.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
      window.setTimeout(() => {
        suspendActiveObserver.current = false;
      }, 650);
    },
    [collapsedPaths, writeCollapsed],
  );

  function jumpFile(dir: 1 | -1) {
    if (filteredFiles.length === 0) return;
    const idx = filteredFiles.findIndex((f) => f.path === activeFile);
    const next =
      idx === -1
        ? 0
        : Math.max(0, Math.min(filteredFiles.length - 1, idx + dir));
    scrollToFile(filteredFiles[next].path);
  }

  function toggleViewed(path: string) {
    const next = new Set(viewed);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    writeViewed(next);
  }

  // Keyboard shortcuts: skip when typing in inputs.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const isField =
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        t?.isContentEditable;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // `/` focuses filter (works even from outside the input)
      if (e.key === "/") {
        if (isField) return;
        e.preventDefault();
        filterInputRef.current?.focus();
        filterInputRef.current?.select();
        return;
      }
      if (isField) return;

      const k = e.key.toLowerCase();
      if (k === "d") setSub("discussion");
      else if (k === "c") setSub("commits");
      else if (k === "f") setSub("files");
      else if (k === "r") setSub("reviews");
      else if (k === "s" && sub === "files")
        writeDisplay(displayMode === "split" ? "unified" : "split");
      else if (k === "]" && sub === "files") jumpFile(1);
      else if (k === "[" && sub === "files") jumpFile(-1);
      else if (k === "v" && sub === "files" && activeFile)
        toggleViewed(activeFile);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub, displayMode, activeFile, filteredFiles, viewed]);

  const reviewCount =
    pr.reviews.length + pr.reviews.reduce((s, r) => s + r.comments.length, 0);

  return (
    <div className="pr-shell">
      <PRHeader
        pr={pr}
        username={username}
        prev={prev}
        next={next}
      />
      <PRTabs
        sub={sub}
        setSub={setSub}
        counts={{
          discussion: pr.comments.length,
          commits: 0,
          files: pr.changedFiles,
          reviews: reviewCount,
        }}
      />

      {sub === "files" ? (
        <>
          <PRToolbar
            additions={pr.additions}
            deletions={pr.deletions}
            displayMode={displayMode}
            setDisplayMode={(m) => writeDisplay(m)}
            onPrevFile={() => jumpFile(-1)}
            onNextFile={() => jumpFile(1)}
          />
          <div className="pr-body">
            <aside className="pr-tree border-r border-neutral-200 bg-neutral-50/40 dark:border-neutral-800 dark:bg-neutral-950/40">
              <PRFileTree
                inputRef={filterInputRef}
                filter={filter}
                setFilter={setFilter}
                files={filteredFiles}
                allFilesCount={files?.length ?? 0}
                viewed={viewed}
                onToggleViewed={toggleViewed}
                activeFile={activeFile}
                onSelect={scrollToFile}
                loading={filesLoading}
              />
            </aside>
            <PRDiffPanel
              panelRef={diffPanelRef}
              sectionRefs={sectionRefs}
              suspendActiveObserver={suspendActiveObserver}
              files={filteredFiles}
              displayMode={displayMode}
              loading={filesLoading}
              error={filesError}
              viewed={viewed}
              reviewCommentsByPath={reviewCommentsByPath}
              activeFile={activeFile}
              onActiveFileChange={setActiveFile}
              collapsedPaths={collapsedPaths}
              onToggleCollapsed={toggleCollapsedPath}
              onAltCollapseAll={altCollapseAllToggle}
            />
          </div>
        </>
      ) : null}

      {sub === "discussion" ? (
        <div className="app-main-scroll">
          <div className="mx-auto max-w-4xl px-6 py-5">
            {pr.body ? (
              <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <MarkdownBody body={pr.body} />
              </div>
            ) : (
              <p className="text-sm italic text-neutral-500">No description.</p>
            )}
            {pr.comments.length > 0 ? (
              <div className="mt-5">
                <CommentList comments={pr.comments} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {sub === "commits" ? (
        <div className="app-main-scroll">
          <div className="mx-auto max-w-3xl px-6 py-12 text-center">
            <p className="text-sm text-neutral-500">
              Per-commit data isn&apos;t loaded for this profile. Open the PR on
              GitHub to inspect individual commits.
            </p>
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              View commits on GitHub ↗
            </a>
          </div>
        </div>
      ) : null}

      {sub === "reviews" ? (
        <div className="app-main-scroll">
          <div className="mx-auto max-w-4xl px-6 py-5">
            {pr.reviews.length > 0 ? (
              <ReviewList reviews={pr.reviews} />
            ) : (
              <p className="text-sm italic text-neutral-500">No reviews.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
