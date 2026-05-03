"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { format, parseISO } from "date-fns";
import type { PRNode } from "@/types/github";
import { isExternalContribution } from "@/lib/classify";
import { PRDetail, PRStatusBadge } from "./pr-detail";

type SortKey = "date" | "loc" | "repo" | "status";
type SortDir = "asc" | "desc";
type Scope = "all" | "external" | "own";
type StatusFilter = "all" | "merged" | "open" | "closed";

interface Props {
  prs: PRNode[];
  username: string;
  externalCount: number;
  ownCount: number;
}

export function PRExplorer({ prs, username, externalCount, ownCount }: Props) {
  const [scope, setScope] = useState<Scope>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = prs;

    if (scope === "external") {
      list = list.filter((pr) => isExternalContribution(pr, username));
    } else if (scope === "own") {
      list = list.filter((pr) => !isExternalContribution(pr, username));
    }

    if (status !== "all") {
      list = list.filter((pr) => {
        if (status === "merged") return pr.state === "MERGED";
        if (status === "open") return pr.state === "OPEN";
        return pr.state === "CLOSED";
      });
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (pr) =>
          pr.title.toLowerCase().includes(q) ||
          pr.repo.nameWithOwner.toLowerCase().includes(q),
      );
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime();
      } else if (sortKey === "loc") {
        cmp = a.additions + a.deletions - (b.additions + b.deletions);
      } else if (sortKey === "repo") {
        cmp = a.repo.nameWithOwner.localeCompare(b.repo.nameWithOwner);
      } else if (sortKey === "status") {
        const order = { MERGED: 0, OPEN: 1, CLOSED: 2 } as const;
        cmp = order[a.state] - order[b.state];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [prs, username, scope, status, sortKey, sortDir, query]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "loc" ? "desc" : "asc");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup
          value={scope}
          onChange={setScope}
          options={[
            { id: "all" as const, label: `All (${prs.length})` },
            { id: "external" as const, label: `External (${externalCount})` },
            { id: "own" as const, label: `Own (${ownCount})` },
          ]}
        />
        <FilterGroup
          value={status}
          onChange={setStatus}
          options={[
            { id: "all" as const, label: "Any status" },
            { id: "merged" as const, label: "Merged" },
            { id: "open" as const, label: "Open" },
            { id: "closed" as const, label: "Closed" },
          ]}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or repo…"
          className="ml-auto w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-neutral-900 sm:w-64 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid grid-cols-[24px_70px_1fr_minmax(140px,200px)_90px_100px] gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span />
          <SortHeader
            current={sortKey}
            dir={sortDir}
            keyId="status"
            onClick={toggleSort}
          >
            Status
          </SortHeader>
          <span>Title</span>
          <SortHeader
            current={sortKey}
            dir={sortDir}
            keyId="repo"
            onClick={toggleSort}
          >
            Repo
          </SortHeader>
          <SortHeader
            current={sortKey}
            dir={sortDir}
            keyId="loc"
            onClick={toggleSort}
            align="right"
          >
            LOC
          </SortHeader>
          <SortHeader
            current={sortKey}
            dir={sortDir}
            keyId="date"
            onClick={toggleSort}
            align="right"
          >
            Date
          </SortHeader>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            No PRs match these filters.
          </div>
        ) : (
          <ul>
            {filtered.map((pr) => {
              const id = `${pr.repo.nameWithOwner}#${pr.number}`;
              const isExt = isExternalContribution(pr, username);
              const open = expanded === id;
              return (
                <li
                  key={id}
                  className="border-t border-neutral-200 first:border-t-0 dark:border-neutral-800"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : id)}
                    className="grid w-full grid-cols-[24px_70px_1fr_minmax(140px,200px)_90px_100px] items-baseline gap-2 px-3 py-2 text-left text-sm transition hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <span
                      className={clsx(
                        "text-xs text-neutral-400 transition",
                        open ? "rotate-90" : "",
                      )}
                    >
                      ▶
                    </span>
                    <span>
                      <PRStatusBadge pr={pr} />
                    </span>
                    <span className="truncate">
                      {isExt ? (
                        <span className="mr-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                          ext
                        </span>
                      ) : null}
                      {pr.title}
                    </span>
                    <span className="truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      {pr.repo.nameWithOwner}
                    </span>
                    <span className="text-right text-xs">
                      <span className="text-emerald-700 dark:text-emerald-400">
                        +{pr.additions}
                      </span>{" "}
                      <span className="text-rose-700 dark:text-rose-400">
                        −{pr.deletions}
                      </span>
                    </span>
                    <span className="text-right text-xs text-neutral-500">
                      {format(parseISO(pr.createdAt), "MMM d, yyyy")}
                    </span>
                  </button>
                  {open ? <PRDetail pr={pr} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-md border border-neutral-300 bg-white p-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={clsx(
            "rounded px-3 py-1 transition",
            value === o.id
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SortHeader({
  children,
  current,
  dir,
  keyId,
  onClick,
  align,
}: {
  children: React.ReactNode;
  current: SortKey;
  dir: SortDir;
  keyId: SortKey;
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = current === keyId;
  return (
    <button
      type="button"
      onClick={() => onClick(keyId)}
      className={clsx(
        "flex items-center gap-1 transition hover:text-neutral-900 dark:hover:text-neutral-100",
        active ? "text-neutral-900 dark:text-neutral-100" : "",
        align === "right" ? "justify-end" : "justify-start",
      )}
    >
      {children}
      <span className="text-[10px]">{active ? (dir === "desc" ? "↓" : "↑") : ""}</span>
    </button>
  );
}
