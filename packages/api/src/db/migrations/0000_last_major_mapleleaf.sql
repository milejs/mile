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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
