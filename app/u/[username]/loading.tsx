export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-start dark:border-neutral-800">
        <div className="h-24 w-24 animate-pulse rounded-full bg-neutral-200 sm:h-32 sm:w-32 dark:bg-neutral-800" />
        <div className="flex-1 space-y-3">
          <div className="h-8 w-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-96 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-72 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
      <div className="mt-8 space-y-4">
        <div className="h-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <p className="mt-6 text-center text-xs text-neutral-500">
        Fetching from GitHub — this can take 10–60 seconds for high-activity profiles…
      </p>
    </main>
  );
}
