"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const EVENT = "gitgambit-session-set";

type DetailEvent = CustomEvent<{ key: string }>;

/**
 * sessionStorage-backed reactive Set<string>. Like useStoredSet but tab-scoped:
 * the GitHub-style "Viewed" checkbox should not persist across browser tabs,
 * matching GitHub's behavior.
 */
export function useSessionSet(
  key: string,
): [Set<string>, (next: Set<string>) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const handler = (e: Event) => {
        const ev = e as DetailEvent;
        if (ev.detail?.key === key) cb();
      };
      window.addEventListener(EVENT, handler);
      return () => window.removeEventListener(EVENT, handler);
    },
    [key],
  );

  const getClient = useCallback(() => {
    try {
      return sessionStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  }, [key]);

  const raw = useSyncExternalStore(subscribe, getClient, () => "");

  const set = useMemo<Set<string>>(() => {
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set();
    } catch {
      return new Set();
    }
  }, [raw]);

  const write = useCallback(
    (next: Set<string>) => {
      try {
        sessionStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch {
        return;
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }));
    },
    [key],
  );

  return [set, write];
}
