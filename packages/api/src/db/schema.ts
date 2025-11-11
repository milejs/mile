import { sql } from "drizzle-orm";
import {
  char,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const medias = pgTable("medias", {
  id: char("id", { length: 32 }).primaryKey(),
  type: text("type"),
  size: integer("size"),
  etag: text("etag"),
  filepath: text("filepath").notNull(),
  width: integer("width"),
  height: integer("height"),
  alt: text("alt"),
  caption: text("caption"),
  title: text("title"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
});

export const pages = pgTable("pages", {
  id: char("id", { length: 32 }).primaryKey(),
  parent_id: char("parent_id", { length: 32 }),
  slug: text("slug").notNull(),
  title: text("title"), // page <title>
  type: text("type"),
  status: text("status"), // published, archived
  content: text("content"), // mdx string
  description: text("description"),
  keywords: text("keywords"),
  og_image_ids: char("og_image_ids", { length: 32 })
    .array()
    .default(sql`ARRAY[]::char(32)[]`),
  llm: text("llm"),
  no_index: integer("no_index"),
  no_follow: integer("no_follow"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
});

export const drafts = pgTable(
  "drafts",
  {
    id: char("id", { length: 32 }).primaryKey(),
    page_id: char("page_id", { length: 32 }).notNull(),
    version: integer("version").notNull(),
    parent_id: char("parent_id", { length: 32 }),
    slug: text("slug").notNull(),
    title: text("title"),
    type: text("type"),
    content: text("content"),
    description: text("description"),
    keywords: text("keywords"),
    og_image_ids: char("og_image_ids", { length: 32 })
      .array()
      .default(sql`ARRAY[]::char(32)[]`),
    llm: text("llm"),
    no_index: integer("no_index"),
    no_follow: integer("no_follow"),

    // Version metadata
    status: text("status").notNull(), // 'draft', 'published', 'archived'
    is_current_draft: integer("is_current_draft").default(0), // boolean flag for the active draft
    published_at: timestamp("published_at"),
    created_by: char("created_by", { length: 32 }), // user id who created this version
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("draft_version_idx").on(table.page_id, table.version),
    index("current_draft_idx").on(table.page_id, table.is_current_draft),
  ],
);

export type InsertPage = typeof pages.$inferInsert;
export type InsertDraft = typeof drafts.$inferInsert;
export type SelectPage = typeof pages.$inferSelect;
export type SelectMedia = typeof medias.$inferSelect;
