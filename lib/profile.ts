import "server-only";
import { cache } from "react";
import { getProfileBundle as fetchBundle, type FetchResult } from "./github";

/**
 * Request-scoped memoized profile fetch. The shell layout and the page
 * underneath both need the bundle; React's cache() ensures we only do the
 * underlying DB/GitHub call once per request.
 */
export const getProfileBundleCached = cache(
  (username: string): Promise<FetchResult> => fetchBundle(username),
);
