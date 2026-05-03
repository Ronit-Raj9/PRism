import { NextResponse } from "next/server";
import { getPRFiles, GitHubError } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ owner: string; repo: string; number: string }> },
) {
  const { owner, repo, number } = await ctx.params;
  const prNumber = Number(number);
  if (!Number.isFinite(prNumber) || prNumber <= 0) {
    return NextResponse.json({ error: "Invalid PR number" }, { status: 400 });
  }
  try {
    const files = await getPRFiles(owner, repo, prNumber);
    return NextResponse.json({ files });
  } catch (e) {
    if (e instanceof GitHubError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
