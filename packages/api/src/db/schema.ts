import { char, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const medias = pgTable('medias', {
  id: char('id', { length: 32 }).primaryKey(),
  type: text('type'),
  size: integer('size'),
  etag: text('etag'),
  filepath: text('filepath').notNull(),
  alt: text('alt'),
  caption: text('caption'),
  title: text('title'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date()),
});

export const pages = pgTable('pages', {
  id: char('id', { length: 32 }).primaryKey(),
  parent_id: char("parent_id", { length: 32 }),
  slug: text('slug').notNull(),
  name: text('name').notNull(), // nickname
  title: text('title'), // page <title>
  content: text('content'), // mdx string
  description: text('description'),
  keywords: text('keywords'),
  llm: text('llm'),
  no_index: integer('no_index'),
  no_follow: integer('no_follow'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date()),
});

export type InsertPage = typeof pages.$inferInsert;
export type SelectPage = typeof pages.$inferSelect;
