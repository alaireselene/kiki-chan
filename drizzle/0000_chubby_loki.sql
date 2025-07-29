CREATE TABLE `conversation_context` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`user_message` text NOT NULL,
	`bot_response` text,
	`interaction_type` text NOT NULL,
	`timestamp` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`charisma` integer DEFAULT 50 NOT NULL,
	`vibe` text DEFAULT 'neutral',
	`total_messages` integer DEFAULT 0 NOT NULL,
	`last_interaction` integer DEFAULT CURRENT_TIMESTAMP,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
