CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"action_type" text NOT NULL,
	"description" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pics" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompter_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"target_role" text NOT NULL,
	"message" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"role" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"device_info" text,
	"created_at" bigint NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "role_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"token" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "role_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"event_date" text NOT NULL,
	"rundown_start_time" text DEFAULT '08:00' NOT NULL,
	"user_id" text NOT NULL,
	"current_offset_seconds" integer DEFAULT 0 NOT NULL,
	"current_rundown_index" integer DEFAULT -1 NOT NULL,
	"timer_status" text DEFAULT 'stopped' NOT NULL,
	"timer_start_time" bigint,
	"timer_elapsed_seconds" integer DEFAULT 0 NOT NULL,
	"enable_push_5m" boolean DEFAULT true NOT NULL,
	"enable_push_1m" boolean DEFAULT true NOT NULL,
	"enable_push_session_change" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rundown_items" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"title" text NOT NULL,
	"duration_seconds" integer NOT NULL,
	"applied_offset_seconds" integer DEFAULT 0 NOT NULL,
	"target_role" text NOT NULL,
	"target_pics" text,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"company_name" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pics" ADD CONSTRAINT "pics_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompter_messages" ADD CONSTRAINT "prompter_messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_tokens" ADD CONSTRAINT "role_tokens_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rundown_items" ADD CONSTRAINT "rundown_items_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;