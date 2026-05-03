import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold">User not found</h1>
      <p className="mt-3 max-w-md text-neutral-600 dark:text-neutral-400">
        We couldn&apos;t find that GitHub username. Double-check the spelling — usernames are case-insensitive but must exist on github.com.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        Try another username
      </Link>
    </main>
  );
}
