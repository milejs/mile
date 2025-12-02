CREATE TYPE "public"."redirect_source" AS ENUM('auto', 'manual', 'import');--> statement-breakpoint
CREATE TYPE "public"."redirect_type" AS ENUM('permanent', 'temporary', 'gone');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" char(32) PRIMARY KEY NOT NULL,
	"page_id" char(32) NOT NULL,
	"version_number" integer NOT NULL,
	"parent_id" char(32),
	"slug" text NOT NULL,
	"title" text,
	"type" text,
	"excerpt" text,
	"content" text,
	"description" text,
	"keywords" text,
	"og_image_ids" char(32)[] DEFAULT ARRAY[]::char(32)[],
	"llm" text,
	"no_index" integer,
	"no_follow" integer,
	"canonical_url" text,
	"created_by" char(32),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "medias" (
	"id" char(32) PRIMARY KEY NOT NULL,
	"type" text,
	"size" integer,
	"etag" text,
	"filepath" text NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text,
	"caption" text,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" char(32) PRIMARY KEY NOT NULL,
	"published_version_id" char(32),
	"draft_version_id" char(32),
	"full_slug" text,
	"status" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "pages_full_slug_unique" UNIQUE("full_slug")
);
--> statement-breakpoint
CREATE TABLE "preview_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"draft_id" char(32) NOT NULL,
	"page_id" char(32) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "preview_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "redirect_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"redirect_id" uuid,
	"previous_destination" varchar(2048),
	"new_destination" varchar(2048) NOT NULL,
	"change_reason" text,
	"changed_by" char(32),
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_path" varchar(2048) NOT NULL,
	"destination_path" varchar(2048) NOT NULL,
	"redirect_type" "redirect_type" DEFAULT 'permanent' NOT NULL,
	"status_code" integer DEFAULT 308 NOT NULL,
	"source" "redirect_source" DEFAULT 'auto' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"content_id" uuid,
	"content_type" varchar(100),
	"hit_count" integer DEFAULT 0 NOT NULL,
	"last_hit_at" timestamp,
	"notes" text,
	"created_by" char(32),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "redirects_source_path_unique" UNIQUE("source_path")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "drafts_id_version__idx" ON "drafts" USING btree ("page_id","version_number");--> statement-breakpoint
CREATE INDEX "drafts_page_id__idx" ON "drafts" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "pages_full_slug__idx" ON "pages" USING btree ("full_slug");--> statement-breakpoint
CREATE INDEX "pages_status__idx" ON "pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "redirect_id_idx" ON "redirect_history" USING btree ("redirect_id");--> statement-breakpoint
CREATE INDEX "changed_at_idx" ON "redirect_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "source_path_idx" ON "redirects" USING btree ("source_path");--> statement-breakpoint
CREATE INDEX "destination_path_idx" ON "redirects" USING btree ("destination_path");--> statement-breakpoint
CREATE INDEX "content_idx" ON "redirects" USING btree ("content_id","content_type");--> statement-breakpoint
CREATE INDEX "active_idx" ON "redirects" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "redirects" USING btree ("created_at");