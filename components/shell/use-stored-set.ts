"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Reactively reads a JSON-encoded `string[]` from localStorage as a Set.
 * Uses `useSyncExternalStore` so SSR returns an empty Set (no hydration
 * mismatch) and writes from other tabs propagate via the `storage` event.
 */
export function useStoredSet(
  key: string,
): [Set<string>, (next: Set<string>) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    [key],
  );

  const getClient = useCallback(() => {
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  }, [key]);

  const raw = useSyncExternalStore(
    subscribe,
    getClient,
    () => "", // server snapshot
  );

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
      const json = JSON.stringify(Array.from(next));
      try {
        localStorage.setItem(key, json);
      } catch {
        return;
      }
      // Notify same-tab subscribers — `storage` only fires across tabs.
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: json }));
    },
    [key],
  );

  return [set, write];
}
