import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const pages = pgTable('pages', {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  parent_id: uuid("parent_id"),
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

export type InsertUser = typeof pages.$inferInsert;
export type SelectUser = typeof pages.$inferSelect;
