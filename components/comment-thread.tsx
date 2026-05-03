import { formatDistanceToNowStrict, parseISO } from "date-fns";
import type { CommentNode, ReviewNode } from "@/types/github";
import { MarkdownBody } from "./markdown-body";

export function CommentList({ comments }: { comments: CommentNode[] }) {
  if (comments.length === 0) return null;
  return (
    <div className="space-y-3">
      {comments.map((c, i) => (
        <CommentBubble key={i} comment={c} />
      ))}
    </div>
  );
}

export function CommentBubble({ comment }: { comment: CommentNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
        <span className="font-medium text-neutral-700 dark:text-neutral-300">
          {comment.authorLogin ?? "unknown"}
        </span>
        <span>·</span>
        <span>{formatDistanceToNowStrict(parseISO(comment.createdAt))} ago</span>
      </div>
      <MarkdownBody body={comment.body} />
    </div>
  );
}

export function ReviewList({ reviews }: { reviews: ReviewNode[] }) {
  const meaningful = reviews.filter(
    (r) => r.body.trim() || r.comments.length > 0 || r.state !== "COMMENTED",
  );
  if (meaningful.length === 0) return null;

  return (
    <div className="space-y-3">
      {meaningful.map((r, i) => (
        <div
          key={i}
          className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {r.authorLogin ?? "unknown"}
            </span>
            <ReviewStateBadge state={r.state} />
            <span className="text-neutral-500">
              · {formatDistanceToNowStrict(parseISO(r.createdAt))} ago
            </span>
          </div>
          {r.body.trim() ? <MarkdownBody body={r.body} /> : null}
          {r.comments.length > 0 ? (
            <div className="mt-3 space-y-2 border-l-2 border-neutral-200 pl-3 dark:border-neutral-800">
              {r.comments.map((rc, j) => (
                <div key={j} className="text-xs">
                  {rc.path ? (
                    <div className="mb-1 font-mono text-neutral-500">
                      {rc.path}
                      {rc.line ? `:${rc.line}` : ""}
                    </div>
                  ) : null}
                  {rc.diffHunk ? (
                    <pre className="mb-1 max-h-32 overflow-auto rounded bg-neutral-100 p-2 font-mono text-[11px] dark:bg-neutral-800">
                      {rc.diffHunk}
                    </pre>
                  ) : null}
                  <MarkdownBody body={rc.body} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ReviewStateBadge({ state }: { state: ReviewNode["state"] }) {
  const map: Record<ReviewNode["state"], { label: string; cls: string }> = {
    APPROVED: {
      label: "approved",
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    },
    CHANGES_REQUESTED: {
      label: "changes requested",
      cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    },
    COMMENTED: {
      label: "commented",
      cls: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    },
    PENDING: {
      label: "pending",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    },
    DISMISSED: {
      label: "dismissed",
      cls: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    },
  };
  const { label, cls } = map[state];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
