import Image from "next/image";
import type { UserProfile } from "@/types/github";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

export function ProfileHeader({ user }: { user: UserProfile }) {
  return (
    <header className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-start dark:border-neutral-800">
      <Image
        src={user.avatarUrl}
        alt={user.login}
        width={120}
        height={120}
        className="h-24 w-24 rounded-full sm:h-32 sm:w-32"
        unoptimized
      />
      <div className="flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {user.name ?? user.login}
          </h1>
          <a
            href={`https://github.com/${user.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            @{user.login}
          </a>
        </div>
        {user.bio ? (
          <p className="mt-2 max-w-2xl text-sm text-neutral-700 dark:text-neutral-300">
            {user.bio}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
          {user.company ? <span>🏢 {user.company}</span> : null}
          {user.location ? <span>📍 {user.location}</span> : null}
          {user.blog ? (
            <a
              href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              🔗 {user.blog}
            </a>
          ) : null}
          {user.twitterUsername ? (
            <a
              href={`https://twitter.com/${user.twitterUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              𝕏 @{user.twitterUsername}
            </a>
          ) : null}
          <span>
            Joined {format(parseISO(user.createdAt), "MMM yyyy")} ·{" "}
            {formatDistanceToNowStrict(parseISO(user.createdAt))} ago
          </span>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-neutral-700 dark:text-neutral-300">
          <span>
            <strong className="font-semibold text-neutral-900 dark:text-neutral-100">
              {user.followers.toLocaleString()}
            </strong>{" "}
            followers
          </span>
          <span>
            <strong className="font-semibold text-neutral-900 dark:text-neutral-100">
              {user.following.toLocaleString()}
            </strong>{" "}
            following
          </span>
          <span>
            <strong className="font-semibold text-neutral-900 dark:text-neutral-100">
              {user.publicRepos.toLocaleString()}
            </strong>{" "}
            public repos
          </span>
        </div>
      </div>
    </header>
  );
}
