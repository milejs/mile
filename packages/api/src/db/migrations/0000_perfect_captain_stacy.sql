CREATE TABLE "drafts" (
	"id" char(32) PRIMARY KEY NOT NULL,
	"page_id" char(32) NOT NULL,
	"version_number" integer NOT NULL,
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
CREATE INDEX "drafts_id_version__idx" ON "drafts" USING btree ("page_id","version_number");--> statement-breakpoint
CREATE INDEX "drafts_page_id__idx" ON "drafts" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "pages_full_slug__idx" ON "pages" USING btree ("full_slug");--> statement-breakpoint
CREATE INDEX "pages_status__idx" ON "pages" USING btree ("status");