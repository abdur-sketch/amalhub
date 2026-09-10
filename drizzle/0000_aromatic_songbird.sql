CREATE TABLE `admin_users` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'auditor' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `disbursements` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`disbursed_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`location` text DEFAULT 'Indonesia' NOT NULL,
	`target` integer NOT NULL,
	`collected` integer DEFAULT 0 NOT NULL,
	`donors` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`tone` text DEFAULT 'mint' NOT NULL,
	`icon` text DEFAULT '✦' NOT NULL,
	`deadline` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `programs_slug_unique` ON `programs` (`slug`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`donor_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`anonymous` integer DEFAULT false NOT NULL,
	`amount` integer NOT NULL,
	`fee` integer DEFAULT 0 NOT NULL,
	`method` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider` text DEFAULT 'manual' NOT NULL,
	`provider_id` text,
	`payment_action` text,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
