import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
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

export const pages = pgTable(
  "pages",
  {
    id: char("id", { length: 32 }).primaryKey(),
    published_version_id: char("published_version_id", { length: 32 }), // nullable
    draft_version_id: char("draft_version_id", { length: 32 }),
    full_slug: text("full_slug").unique(), // Denormalized for published pages
    status: text("status"), // NULL = unpublished, 'published', 'archived'
    published_at: timestamp("published_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("pages_full_slug__idx").on(table.full_slug),
    index("pages_status__idx").on(table.status),
  ],
);

export const drafts = pgTable(
  "drafts",
  {
    id: char("id", { length: 32 }).primaryKey(),
    page_id: char("page_id", { length: 32 }).notNull(),
    // TODO: do we need version_number?
    version_number: integer("version_number").notNull(),

    // Hierarchy (NO full_slug - computed on-demand for drafts)
    parent_id: char("parent_id", { length: 32 }), // MUST point to canonical pages.id, not to drafts.id
    slug: text("slug").notNull(),

    // Content fields
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
    canonical_url: text("canonical_url"),

    // Version metadata
    created_by: char("created_by", { length: 32 }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    reason: text("reason"), // 'create', 'manual-save', 'auto-save', 'publish', 'revert', 'move'
  },
  (table) => [
    index("drafts_id_version__idx").on(table.page_id, table.version_number),
    index("drafts_page_id__idx").on(table.page_id),
  ],
);

// Type definitions
export type SelectPage = typeof pages.$inferSelect;
export type InsertPage = typeof pages.$inferInsert;
export type SelectDraft = typeof drafts.$inferSelect;
export type InsertDraft = typeof drafts.$inferInsert;
export type SelectMedia = typeof medias.$inferSelect;

export const preview_tokens = pgTable("preview_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  draft_id: char("draft_id", { length: 32 }).notNull(),
  page_id: char("page_id", { length: 32 }).notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const redirect_type_enum = pgEnum("redirect_type", [
  "permanent", // 308 (301) - Permanent redirect
  "temporary", // 307 (302) - Temporary redirect
  "gone", // 410 - Content permanently removed
]);

export const redirect_source_enum = pgEnum("redirect_source", [
  "auto", // Automatically created by system
  "manual", // Manually created by admin
  "import", // Imported from external source
]);

export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source_path: varchar("source_path", { length: 2048 }).notNull().unique(),
    destination_path: varchar("destination_path", { length: 2048 }).notNull(),
    redirect_type: redirect_type_enum("redirect_type")
      .default("permanent")
      .notNull(),
    status_code: integer("status_code").default(308).notNull(),
    source: redirect_source_enum("source").default("auto").notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    content_id: uuid("content_id"), // page_id
    content_type: varchar("content_type", { length: 100 }), // page / post
    hit_count: integer("hit_count").default(0).notNull(),
    last_hit_at: timestamp("last_hit_at", { mode: "date" }),
    notes: text("notes"),
    created_by: char("created_by", { length: 32 }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
    expires_at: timestamp("expires_at"),
  },
  (table) => [
    index("source_path_idx").on(table.source_path),
    index("destination_path_idx").on(table.destination_path),
    index("content_idx").on(table.content_id, table.content_type),
    index("active_idx").on(table.is_active),
    index("created_at_idx").on(table.created_at),
  ],
);

export type SelectRedirect = typeof redirects.$inferSelect;
export type InsertRedirect = typeof redirects.$inferInsert;

export const redirect_history = pgTable(
  "redirect_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    redirect_id: uuid("redirect_id"),
    previous_destination: varchar("previous_destination", { length: 2048 }),
    new_destination: varchar("new_destination", { length: 2048 }).notNull(),
    change_reason: text("change_reason"),
    changed_by: char("changed_by", { length: 32 }),
    changed_at: timestamp("changed_at").notNull().defaultNow(),
  },
  (table) => [
    index("redirect_id_idx").on(table.redirect_id),
    index("changed_at_idx").on(table.changed_at),
  ],
);

// // Aliases for joins
// import { alias } from 'drizzle-orm/pg-core';
// export const publishedVersion = alias(drafts, 'published_version');
// export const draftVersion = alias(drafts, 'draft_version');

/**
 *
 The simplest, most production-grade strategy is **not** to think of them as
 two separate "draft" and "published" pages, but as **one "Page" that has multiple "Versions"**
 (one of which is "the draft" and one of which *might* be "the published" one).
 ---

 ### 1. 🏛️ The Recommended Schema: "Canonical Page" + "Revisions"

 Instead of one "pages" table, you use two. This is the key to simplifying everything.

 #### Table 1: `Pages`
 This table represents the **abstract idea** of a page. It doesn't store content like titles or slugs. It only stores a stable ID and pointers to its current states.

 | Column | Type | Notes |
 | :--- | :--- | :--- |
 | `id` | UUID / Int | Primary Key. This ID *never* changes. This is the "Page." |
 | `current_draft_version_id` | FK (links to `PageVersions.id`) | Points to the one "live draft" version. |
 | `current_published_version_id` | FK (links to `PageVersions.id`) | **Nullable**. Points to the published version, if one exists. |
 | `created_at` | Timestamp | When the "Page" entity was first created. |
 | `updated_at` | Timestamp | When its pointers were last changed. |

 #### Table 2: `PageVersions`
 This table is an **immutable log** of all content changes. Once a version is saved, it's never edited (instead, a new one is created).

 | Column | Type | Notes |
 | :--- | :--- | :--- |
 | `id` | UUID / Int | Primary Key. A unique ID for this *version*. |
 | `page_id` | FK (links to `Pages.id`) | Connects this version back to its canonical "Page." |
 | `title` | String | The title *for this specific version*. |
 | `slug` | String | The slug *for this specific version*. |
 | `body` | JSON / Text | The page content *for this specific version*. |
 | `parent_page_id` | FK (links to `Pages.id`) | **This is the key!** It links to the *canonical parent page*, not a specific version. |
 | `created_at` | Timestamp | When this *version* was saved. |

 ---

 ### 2. ⚙️ The Strategy: How It All Works

 This model makes drafts, publishing, and queries simple.

 * **When an editor edits a page:**
     1.  They open the "About Us" page (`Pages.id = 1`).
     2.  The CMS loads the content from the version pointed to by `current_draft_version_id`.
     3.  When they click "Save Draft," the CMS **creates a new row** in `PageVersions` with the new content (e.g., `id = 124`).
     4.  It then updates the `Pages` table: `UPDATE Pages SET current_draft_version_id = 124 WHERE id = 1`.

 * **When an editor "Publishes" a page:**
     * This is just a pointer swap. It's instant and atomic.
     * `UPDATE Pages SET current_published_version_id = current_draft_version_id WHERE id = 1`
     * Now, both the draft and published pointers point to the *same* version. If the editor makes a new change, they'll get a new `current_draft_version_id`, but the published one will remain, pointing to the last published version.

 * **How to Query for the Live Site:**
     * You get *only* the published versions. This query builds your live website.
     * `SELECT T2.* FROM Pages AS T1 JOIN PageVersions AS T2 ON T1.current_published_version_id = T2.id`

 * **How to Query for the Editor (e.g., in the "Pages" list):**
     * You get *only* the latest draft versions. This is what the editor sees and interacts with.
     * `SELECT T2.* FROM Pages AS T1 JOIN PageVersions AS T2 ON T1.current_draft_version_id = T2.id`

 ---

 ### 3. 💡 Answering Your UX/UI Questions

 This model solves your specific UX problems cleanly.

 #### **Core UX Principle:**
 > The editor **never** works with "versions." They only work with "Pages." The UI completely hides the `PageVersions` table. The editor just sees a list of pages (e.g., "About Us," "Contact") and a "Publish" button.

 #### **Your Example: Changing a Page's Parent**
 This is the most brilliant part of this model.

 * **Question:** If an editor wants to change the parent for a *draft* page, what list of pages do they see?
 * **Answer:** They see the list of **all other draft pages**. (Technically, the list of all *canonical pages*, presented using their `draft` titles).

 Let's walk through it:
 1.  The editor is on the *draft* of "Our Team."
 2.  They click "Change Parent."
 3.  The CMS shows a modal. To populate this list, it runs the **editor query** (`...JOIN...ON T1.current_draft_version_id = T2.id`) to get the `title` and `id` for all pages.
 4.  The editor sees "About Us" (which is `Pages.id = 1`) and "Services" (`Pages.id = 2`) in the list.
 5.  They choose "About Us" as the new parent.
 6.  When they save, the new `PageVersions` row for "Our Team" gets its `parent_page_id` column set to `1`.

 **Why this is so powerful:** The relationship is stored as `Page "Our Team" (draft) -> Page "About Us" (canonical)`.

 * **In the Editor/Preview:** When you build the sitemap, your preview query finds the "Our Team" draft, sees `parent_page_id = 1`, and then fetches the *draft* version of `Page 1` ("About Us"). The draft hierarchy is correct.
 * **On the Live Site:** When the live site query builds the sitemap, it finds the "Our Team" *published* version, sees `parent_page_id = 1`, and then fetches the *published* version of `Page 1` ("About Us"). The live hierarchy is also correct, even if its slug or title is totally different from the draft.

 This design completely avoids the complicated "what if the draft parent gets published" problem. The relationship is to the stable, canonical `Page`, and the context (draft vs. published) determines which *version* of that parent to show.

 ### A Simpler (But Worse) Alternative

 If that is still too complex, the "quick and dirty" model is **Shadow Fields** in one table. **I do not recommend this** for a "production-grade" system, as it's inflexible and doesn't provide version history.

 * **Single Table:** `Pages`
 * **Columns:** `id`, `title`, `slug`, `body`, `parent_id`... and then... `draft_title`, `draft_slug`, `draft_body`, `draft_parent_id`.
 * **How it works:** The main fields are for the "published" version. The `draft_` fields are for the "draft."
 * **Publishing:** You run a big `UPDATE` query that copies all `draft_` data into the main columns (`UPDATE Pages SET title = draft_title, slug = draft_slug...`).
 * **Why it's bad:** It's clunky, doesn't scale, and you have no history. What if you want to roll back to 3 versions ago? You can't.

 **My recommendation is to use the "Canonical Page" + "Revisions" model.** It is the industry standard and scales from a simple blog to a massive enterprise website.

 Would you like to go deeper into how to handle scheduling a publish or preview links with this model?
 */

/**
 * This is the most critical and complex part of this model, and you've hit on the exact right questions.

 Having the `slug` only in `PageVersions` is the correct approach. The key is to realize that the **frontend** (live site) and **backend** (editor) have completely different needs. The frontend needs high-speed, indexed lookups, while the editor needs dynamic, real-time calculations.

 Here's the detailed breakdown of how to handle this.

 -----

 ### 1\. 🚀 Frontend Routing: The Live Site

 Your live site must be fast. You cannot recursively query the database on every page load to build a path. The solution is **denormalization**. You create a separate, "materialized view" or "lookup table" that is *only* for routing published pages.

 #### The "PublishedRoutes" Table

 I recommend adding a new table specifically for this.

 | Column | Type | Notes |
 | :--- | :--- | :--- |
 | `full_slug_path` | String (UNIQUE) | e.g., `/about-us/our-team`. This is the lookup key. |
 | `page_version_id` | FK (links to `PageVersions.id`) | The *exact* published version to render. |
 | `page_id` | FK (links to `Pages.id`) | The canonical page (good for metrics). |

 #### How It Works:

 **1. Querying by Full Slug (The Frontend Request):**
 A request comes in for `https.example.com/about-us/our-team`.

 1.  Your application router takes the path `/about-us/our-team`.
 2.  It performs **one, single, lightning-fast query**:
     ```sql
     SELECT page_version_id
     FROM PublishedRoutes
     WHERE full_slug_path = '/about-us/our-team';
     ```
 3.  This query instantly returns the `page_version_id` (e.g., `124`).
 4.  Your app now knows *exactly* which `PageVersion` to fetch and render. No recursion, no joins.

 **2. Populating This Table (The "Publish" Action):**
 This table is a "write-heavy" cache. It's updated *only* when a page is published or unpublished.

 When an editor clicks "Publish" on a page:

 1.  You update the pointer as before:
     `UPDATE Pages SET current_published_version_id = :new_version_id WHERE id = :page_id`
 2.  **After** this, you trigger a "rebuild routes" function. This function is critical. It:
       * Finds the page that was just published.
       * Recursively walks up its `parent_page_id` chain (by looking at the *published* version of each parent) to build its `full_slug_path`.
       * Example: To publish "Our Team" (slug: `our-team`) under "About Us" (slug: `about-us`):
           * It finds "Our Team," gets its slug `our-team`.
           * It gets its `parent_page_id` (e.g., `1`).
           * It fetches the `current_published_version` for Page `1` and gets its slug `about-us`.
           * It builds the path: `/about-us/our-team`.
       * It then does an `UPSERT` (update or insert) into `PublishedRoutes`:
         `UPSERT INTO PublishedRoutes (full_slug_path, page_version_id, page_id) VALUES ('/about-us/our-team', 124, 5)`

 **What if a parent slug changes?** (e.g., "About Us" -\> "About")
 When you publish the change for "About Us," you must also trigger a job to **rebuild the routes for all its children**. This is the trade-off for a fast read. You find all `PageVersions` that have "About Us" as a parent and rebuild their paths in the `PublishedRoutes` table.

 -----

 ### 2\. ✍️ Editor Experience: Drafts

 The editor is the opposite. Performance is less critical (a human is waiting, not a high-traffic server), but **data must be 100% real-time and based on drafts**.

 Here, you **do not** use the `PublishedRoutes` table. You calculate things dynamically.

 #### A. Displaying a Draft's Full Slug (e.g., "Preview URL")

 When an editor is on the "Our Team" page, they need to see its *draft* path. You find this with a recursive function in your application code, **not** in SQL.

 ```
 // Pseudocode
 function get_draft_path(page_id):
     version = query("SELECT T2.slug, T2.parent_page_id
                      FROM Pages T1
                      JOIN PageVersions T2 ON T1.current_draft_version_id = T2.id
                      WHERE T1.id = :page_id")

     if (version.parent_page_id == NULL):
         return "/" + version.slug
     else:
         parent_path = get_draft_path(version.parent_page_id)
         return parent_path + "/" + version.slug
 ```

 This function walks up the `parent_page_id` chain, *always* grabbing the `current_draft_version` of each parent. This correctly builds `/new-about-us/our-awesome-team` even if none of it is published.

 #### B. Searching Pages by Slug (Autocomplete)

 This is for a search box in the CMS. The editor only wants to search for *drafts*, because that's what they work on.

 This query is simple. It *only* looks at the latest draft versions.

 ```sql
 SELECT T1.id, T2.title, T2.slug
 FROM Pages AS T1
 JOIN PageVersions AS T2 ON T1.current_draft_version_id = T2.id
 WHERE T2.title LIKE :query
    OR T2.slug LIKE :query;
 ```

 This finds all pages whose *current draft* title or slug matches the search.

 #### C. Preventing Slug Conflicts (The Most Important\!)

 This is your main validation logic. When an editor tries to save a draft:

   * **You must check for conflicts *at the same level*.** A slug just needs to be unique *under its parent*.
   * **You must check against *both* drafts and published pages.** A draft can't have the slug of a *published* page, and vice-versa.

 When saving a `PageVersion` (e.g., `slug = 'our-team'`, `parent_page_id = 1`):

 1.  **Check for Draft Conflicts:** "Is there *any other* page whose *current draft version* has this slug and parent?"

     ```sql
     SELECT 1
     FROM Pages T1
     JOIN PageVersions T2 ON T1.current_draft_version_id = T2.id
     WHERE T1.id != :current_page_id  -- Not this page
     AND T2.slug = 'our-team'
     AND T2.parent_page_id = 1;
     ```

     If this returns a row, **block the save**.

 2.  **Check for Published Conflicts:** "Is there *any other* page whose *current published version* has this slug and parent?"

     ```sql
     SELECT 1
     FROM Pages T1
     JOIN PageVersions T2 ON T1.current_published_version_id = T2.id
     WHERE T1.id != :current_page_id
     AND T2.slug = 'our-team'
     AND T2.parent_page_id = 1;
     ```

     If this returns a row, **block the save**. Tell the editor, "This slug is already used by the published 'Our Team' page. Please choose another."

 This combination gives you the best of both worlds:

   * **Frontend:** A super-fast, pre-built routing table.
   * **Backend:** A dynamic, real-time view of the draft sitemap.

 This architecture is robust and scales extremely well. The next logical step to consider with this model is handling preview links.

 Would you like to explore how to generate "preview" links for draft content using this schema?
 */

/**
  * Generating preview links for drafts is a solved problem with this model, and it's much simpler than it seems. The key is to **stop thinking about slugs** for preview.

  You don't use the page's *draft* slug (e.g., `/new-about/our-team`) for preview, because that path doesn't "exist" in your live router. Trying to make it exist is a path to immense complexity.

  Instead, you use a **token-based preview system**.

  ### The Strategy: Preview by Token, Not by Slug

  The goal is to show a non-technical stakeholder a specific draft. They don't care about the URL; they just care about the content.

  Here’s the complete workflow.

  ---

  ### 1. 🔑 The "Preview" Table (Optional but Recommended)

  For enhanced security, you can store temporary preview tokens.

  **`PreviewTokens` Table**

  | Column | Type | Notes |
  | :--- | :--- | :--- |
  | `token` | String (UNIQUE) | A secure, random, unguessable string (e.g., a JWT or UUID). |
  | `page_version_id` | FK (links to `PageVersions.id`) | The *exact draft version* to be previewed. |
  | `expires_at` | Timestamp | Good practice. e.g., "valid for 24 hours." |

  ---

  ### 2. ✍️ The Editor's Flow

  1.  An editor is working on a draft of "Our Team" (this is `PageVersions.id = 124`).
  2.  They click the "Share Preview" button.
  3.  Your backend CMS does the following:
      * Generates a secure, unique token (e.g., `abc-123-xyz-789`).
      * Finds the `current_draft_version_id` for this page (which is `124`).
      * Creates a new row in the `PreviewTokens` table:
          `('abc-123-xyz-789', 124, '2025-11-14 20:01:00')`
      * It hands a special URL back to the editor.

  The URL it generates **does not** use the draft slug. It points to a special, dedicated preview route in your frontend application:

  **`https.example.com/preview?token=abc-123-xyz-789`**

  ---

  ### 3. 🚀 The Frontend/Routing Flow

  This is how your application handles that special URL.

  1.  A stakeholder (or the editor) opens `https://example.com/preview?token=...` in their browser.
  2.  Your website's router sees the `/preview` path. This is a **special route** you've defined, *not* part of your normal page routing.
  3.  The frontend app takes the `token` from the URL.
  4.  It makes a request to a secure backend API endpoint (e.g., `GET /api/preview-content?token=...`).
  5.  Your backend API:
      * Receives the token `abc-123-xyz-789`.
      * Queries the `PreviewTokens` table: `SELECT page_version_id FROM PreviewTokens WHERE token = '...' AND expires_at > NOW()`.
      * It finds the token is valid and linked to `page_version_id = 124`.
      * It then fetches all the content for that *exact* version: `SELECT * FROM PageVersions WHERE id = 124`.
      * It returns the JSON content for the "Our Team" draft.
  6.  Your frontend application receives this JSON and renders the page, just as it would any other page.

  ### The "Gotcha": Layouts, Headers, and Footers

  This flow perfectly renders the *content* of the draft. But what about the rest of the page, like the main navigation or the footer?

  * **Simple Approach:** Render the draft content inside the *live, published* site shell. This is 99% of what's needed. The navigation and footer will be the same as the live site.
  * **Advanced "Full Site" Preview:** This is far more complex. It involves setting a preview cookie (e.g., `X-PREVIEW-MODE=true`). When this cookie is present, *all* your frontend data queries are modified to ask for the `current_draft_version` instead of the `current_published_version`. This lets the editor browse the *entire* site in its draft state. This is powerful but 10x the work.

  **My recommendation is to start with the token-based, single-page preview.** It's secure, robust, and solves the core problem beautifully. You're completely bypassing the complex "draft slug" problem by using a dedicated preview route.
  */
