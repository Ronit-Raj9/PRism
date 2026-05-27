import type { GitGambitScore } from "@/lib/gitgambit-score";

export function GitGambitScoreCard({ score }: { score: GitGambitScore }) {
  const subs: { label: string; value: number }[] = [
    { label: "Velocity", value: score.velocity },
    { label: "Quality", value: score.quality },
    { label: "Collaboration", value: score.collaboration },
    { label: "Consistency", value: score.consistency },
    { label: "Range", value: score.range },
  ];
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            GitGambit Score
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums">
            {score.overall}
            <span className="text-base font-medium text-neutral-500">/100</span>
          </div>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          style={{ width: `${score.overall}%` }}
        />
      </div>
      <ul className="mt-4 space-y-2">
        {subs.map((s) => (
          <li key={s.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-neutral-600 dark:text-neutral-400">
              {s.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className="h-full bg-violet-500"
                style={{ width: `${s.value}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums">
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
