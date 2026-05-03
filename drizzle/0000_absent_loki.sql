CREATE TABLE `pr_diff_cache` (
	`repo` text NOT NULL,
	`pr_number` integer NOT NULL,
	`files` text NOT NULL,
	`fetched_at` integer NOT NULL,
	PRIMARY KEY(`repo`, `pr_number`)
);
--> statement-breakpoint
CREATE TABLE `profile_cache` (
	`username` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
