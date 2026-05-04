"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_NOTIFY = "gitscope-storage-write";

function notifyStorageKey(key: string) {
  window.dispatchEvent(new CustomEvent(STORAGE_NOTIFY, { detail: { key } }));
}

/**
 * Reactively reads a string from localStorage. Returns the stored value or
 * `null` when absent. Server snapshot is always `null` to avoid hydration
 * mismatch — the client renders a default first, then re-renders with the
 * persisted value once mounted.
 */
export function useStoredValue(
  key: string,
): [string | null, (next: string | null) => void] {
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
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  const value = useSyncExternalStore(
    subscribe,
    getClient,
    () => null, // server snapshot
  );

  const write = useCallback(
    (next: string | null) => {
      try {
        if (next === null) localStorage.removeItem(key);
        else localStorage.setItem(key, next);
      } catch {
        return;
      }
      notifyStorageKey(key);
    },
    [key],
  );

  return [value, write];
}
