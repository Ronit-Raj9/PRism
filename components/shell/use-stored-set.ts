"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/** Same-tab localStorage writes do not fire `storage`; synthetic StorageEvent is unreliable. */
const STORAGE_NOTIFY = "gitscope-storage-write";

function notifyStorageKey(key: string) {
  window.dispatchEvent(new CustomEvent(STORAGE_NOTIFY, { detail: { key } }));
}

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
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      const onSameTab = (e: Event) => {
        const d = (e as CustomEvent<{ key?: string }>).detail;
        if (d?.key === key) cb();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(STORAGE_NOTIFY, onSameTab);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(STORAGE_NOTIFY, onSameTab);
      };
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
      notifyStorageKey(key);
    },
    [key],
  );

  return [set, write];
}
