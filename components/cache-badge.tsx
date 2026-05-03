import { formatDistanceToNowStrict, parseISO } from "date-fns";

interface Props {
  state: "fresh" | "stale" | "miss";
  fetchedAt: string;
  rateRemaining: number | null;
}

export function CacheBadge({ state, fetchedAt, rateRemaining }: Props) {
  const stateLabel = state === "fresh" ? "Cached" : state === "stale" ? "Cached (stale)" : "Live";
  const stateClass =
    state === "fresh"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : state === "stale"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
        : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      <span className={`rounded-full px-2 py-0.5 font-medium ${stateClass}`}>
        {stateLabel}
      </span>
      <span>
        Fetched {formatDistanceToNowStrict(parseISO(fetchedAt))} ago
      </span>
      {rateRemaining !== null ? (
        <span
          className={
            rateRemaining < 100
              ? "text-amber-600 dark:text-amber-400"
              : ""
          }
        >
          · GitHub rate limit: {rateRemaining.toLocaleString()} remaining
        </span>
      ) : null}
    </div>
  );
}
