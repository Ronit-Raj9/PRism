"use client";

import { useCallback, useSyncExternalStore } from "react";

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
      window.dispatchEvent(
        new StorageEvent("storage", { key, newValue: next }),
      );
    },
    [key],
  );

  return [value, write];
}
