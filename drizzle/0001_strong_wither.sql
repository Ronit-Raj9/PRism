CREATE TABLE `saved_users` (
	`username` text PRIMARY KEY NOT NULL,
	`label` text,
	`note` text,
	`first_saved_at` integer NOT NULL,
	`last_visited_at` integer
);
