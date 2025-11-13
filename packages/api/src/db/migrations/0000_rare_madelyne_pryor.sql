CREATE TABLE "drafts" (
	"id" char(32) PRIMARY KEY NOT NULL,
	"page_id" char(32) NOT NULL,
	"version" integer NOT NULL,
	"parent_id" char(32),
	"slug" text NOT NULL,
	"title" text,
	"type" text,
	"content" text,
	"description" text,
	"keywords" text,
	"og_image_ids" char(32)[] DEFAULT ARRAY[]::char(32)[],
	"llm" text,
	"no_index" integer,
	"no_follow" integer,
	"canonical_url" text,
	"status" text NOT NULL,
	"is_current_draft" integer DEFAULT 0,
	"published_at" timestamp,
	"created_by" char(32),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
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
	"parent_id" char(32),
	"slug" text NOT NULL,
	"title" text,
	"type" text,
	"status" text,
	"content" text,
	"description" text,
	"keywords" text,
	"og_image_ids" char(32)[] DEFAULT ARRAY[]::char(32)[],
	"llm" text,
	"no_index" integer,
	"no_follow" integer,
	"canonical_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "draft_version_idx" ON "drafts" USING btree ("page_id","version");--> statement-breakpoint
CREATE INDEX "current_draft_idx" ON "drafts" USING btree ("page_id","is_current_draft");