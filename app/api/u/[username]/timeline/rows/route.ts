import { GitHubError } from "@/lib/github";
import { getProfileBundleCached } from "@/lib/profile";
import {
  buildTimelinePaged,
  parseTimelineFiltersFromSearchParams,
  TIMELINE_INITIAL_LIMIT,
} from "@/lib/timeline";

const MAX_LIMIT = 200;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await ctx.params;
  const username = decodeURIComponent(raw);
  const url = new URL(req.url);
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limitRaw =
    Number.parseInt(url.searchParams.get("limit") ?? String(TIMELINE_INITIAL_LIMIT), 10) ||
    TIMELINE_INITIAL_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, limitRaw));

  let result;
  try {
    result = await getProfileBundleCached(username);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    throw e;
  }

  const params = parseTimelineFiltersFromSearchParams(url.searchParams);
  const { rows, total } = buildTimelinePaged(
    result.bundle,
    result.bundle.user.login,
    params,
    offset,
    limit,
  );
  const nextOffset = offset + rows.length < total ? offset + rows.length : null;

  return Response.json({ rows, total, nextOffset });
}
