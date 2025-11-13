import { db } from "./db/drizzle";
import {
  pages as pagesTable,
  drafts as draftsTable,
  medias as mediasTable,
  SelectPage,
  SelectMedia,
  InsertDraft,
} from "./db/schema";
import { desc, eq, or, and, ilike, inArray, count, sql } from "drizzle-orm";
import { generateId } from "./lib/generate-id";

export async function searchPagesByTitle(query: string, limit = 20) {
  const searchCondition = or(
    ilike(pagesTable.title, `%${query}%`),
    ilike(pagesTable.slug, `%${query}%`),
  );
  const results = await db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
    })
    .from(pagesTable)
    .where(searchCondition)
    .limit(limit);

  return results;
}

export async function searchPages(query: string, limit = 20, offset = 0) {
  const searchCondition = or(
    ilike(pagesTable.title, `%${query}%`),
    ilike(pagesTable.slug, `%${query}%`),
  );
  return await Promise.all([
    // Get paginated results
    db
      .select()
      .from(pagesTable)
      .where(searchCondition)
      .limit(limit)
      .offset(offset)
      .orderBy(pagesTable.title), // order by title

    // Get total count for pagination
    db
      .select({ count: count() })
      .from(pagesTable)
      .where(searchCondition)
      .then((result) => result[0].count),
  ]);
}

export async function listPaginatedPages(limit = 20, offset = 0) {
  return await Promise.all([
    // Get the current page of data
    db
      .select({
        // Page info
        id: pagesTable.id,
        type: pagesTable.type,
        created_at: pagesTable.created_at,
        updated_at: pagesTable.updated_at,

        // Status info
        status: pagesTable.status, // NULL = unpublished, 'published', 'archived'

        // Published version info
        published_parent_id: pagesTable.parent_id,
        published_slug: pagesTable.slug,
        published_title: pagesTable.title,

        // Draft version info (if exists)
        draft_id: draftsTable.id,
        draft_parent_id: draftsTable.parent_id,
        draft_slug: draftsTable.slug,
        draft_title: draftsTable.title,
        draft_updated_at: draftsTable.updated_at,
        draft_published_at: draftsTable.published_at,
        draft_version: draftsTable.version,
      })
      .from(pagesTable)
      .leftJoin(
        draftsTable,
        and(
          eq(draftsTable.page_id, pagesTable.id),
          eq(draftsTable.is_current_draft, 1),
        ),
      )
      .limit(limit)
      .offset(offset)
      .orderBy(desc(pagesTable.created_at)), // or whatever ordering you want

    // Get total count
    db
      .select({ count: count() })
      .from(pagesTable)
      .then((result) => result[0].count),
  ]);
}

export async function listAllPages() {
  return await db
    .select({
      // Page info
      id: pagesTable.id,
      type: pagesTable.type,
      created_at: pagesTable.created_at,
      updated_at: pagesTable.updated_at,

      // Status info
      status: pagesTable.status, // NULL = unpublished, 'published', 'archived'

      // Published version info
      published_parent_id: pagesTable.parent_id,
      published_slug: pagesTable.slug,
      published_title: pagesTable.title,

      // Draft version info (if exists)
      draft_id: draftsTable.id,
      draft_parent_id: draftsTable.parent_id,
      draft_slug: draftsTable.slug,
      draft_title: draftsTable.title,
      draft_updated_at: draftsTable.updated_at,
      draft_published_at: draftsTable.published_at,
      draft_version: draftsTable.version,
    })
    .from(pagesTable)
    .leftJoin(
      draftsTable,
      and(
        eq(draftsTable.page_id, pagesTable.id),
        eq(draftsTable.is_current_draft, 1),
      ),
    )
    .orderBy(desc(pagesTable.created_at));
}
// export async function listAllPages() {
//   return await db
//     .select({
//       id: pagesTable.id,
//       parent_id: pagesTable.parent_id,
//       slug: pagesTable.slug,
//       title: pagesTable.title,
//       created_at: pagesTable.created_at,
//       updated_at: pagesTable.updated_at,
//     })
//     .from(pagesTable)
//     .orderBy(desc(pagesTable.created_at));
// }

export async function saveDraft(
  page_id: string,
  updates: Partial<InsertDraft>,
) {
  return await db
    .update(draftsTable)
    .set({
      ...updates,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(draftsTable.page_id, page_id),
        eq(draftsTable.is_current_draft, 1),
      ),
    )
    .returning();
}

// Create a page
export async function createNewPage(
  data: {
    id: string;
    slug: string;
    title?: string;
    parent_id?: string | null;
    type?: string;
    content?: string;
    description?: string;
    keywords?: string;
    og_image_ids?: string[];
    llm?: string;
    no_index?: number;
    no_follow?: number;
  },
  userId: string,
) {
  const inserted_pages = await db.transaction(async (tx) => {
    // Create page record (minimal, NO STATUS or status is NULL)
    const inserted_pages = await tx
      .insert(pagesTable)
      .values({
        id: data.id,
        parent_id: data.parent_id,
        slug: data.slug,
        title: data.title || "Untitled",
        type: data.type,
        status: null, // NULL = never published yet
        content: data.content,
        description: data.description,
        keywords: data.keywords,
        og_image_ids: data.og_image_ids || [],
        llm: data.llm,
        no_index: data.no_index,
        no_follow: data.no_follow,
      })
      .returning();

    // Create first draft version with actual content
    const versionId = generateId();
    await tx.insert(draftsTable).values({
      id: versionId,
      page_id: data.id,
      version: 1,
      parent_id: data.parent_id,
      slug: data.slug,
      title: data.title || "Untitled",
      type: data.type,
      content: data.content || "",
      description: data.description,
      keywords: data.keywords,
      og_image_ids: data.og_image_ids || [],
      llm: data.llm,
      no_index: data.no_index,
      no_follow: data.no_follow,
      status: "draft", // draft exists only in versions table
      is_current_draft: 1,
      published_at: null,
      created_by: userId,
    });

    return inserted_pages;
  });

  return inserted_pages;
}

export async function getPageFullPath(pageId: string) {
  if (!pageId) {
    return "/";
  }

  try {
    // Use recursive CTE to build full slug path
    const result = await db.execute(sql`
        WITH RECURSIVE page_path AS (
          -- Base case: start with the target page
          SELECT
            id,
            slug,
            parent_id,
            ARRAY[slug] as path_segments,
            1 as depth
          FROM pages
          WHERE id = ${pageId}

          UNION ALL

          -- Recursive case: traverse up to parents
          SELECT
            p.id,
            p.slug,
            p.parent_id,
            ARRAY[p.slug] || pp.path_segments as path_segments,
            pp.depth + 1
          FROM pages p
          INNER JOIN page_path pp ON p.id = pp.parent_id
          WHERE pp.parent_id IS NOT NULL
        )
        SELECT
          path_segments,
          depth
        FROM page_path
        ORDER BY depth DESC
        LIMIT 1
      `);

    if (!result.rows || result.rows.length === 0) {
      return null; // Page not found
    }

    const segments = (result.rows[0].path_segments as string[]).filter(Boolean); // Remove empty strings
    return segments.length > 0 ? "/" + segments.join("/") : null;
  } catch (error) {
    console.error("Error in getPageFullPath:", error);
    throw error;
  }
}

export async function loadPageById(
  page_id: string,
  options?: {
    preview?: boolean;
    draft_id?: string;
    version_number?: number;
  },
) {
  console.info("loadPageById", options);

  // Load specific version by ID
  if (options?.draft_id) {
    const version = await db
      .select()
      .from(draftsTable)
      .where(eq(draftsTable.id, options.draft_id))
      .limit(1);

    return version[0];
  }

  // Load specific version by number
  if (options?.version_number) {
    const version = await db
      .select()
      .from(draftsTable)
      .where(
        and(
          eq(draftsTable.page_id, page_id),
          eq(draftsTable.version, options.version_number),
        ),
      )
      .limit(1);

    return version[0];
  }

  // Preview mode: load current draft
  if (options?.preview) {
    const draft = await db
      .select()
      .from(draftsTable)
      .where(
        and(
          eq(draftsTable.page_id, page_id),
          eq(draftsTable.is_current_draft, 1),
        ),
      )
      .limit(1);

    if (draft.length > 0) {
      return draft[0];
    }
  }

  // Default: load published page
  const page = await db
    .select()
    .from(pagesTable)
    .where(and(eq(pagesTable.id, page_id), eq(pagesTable.status, "published")))
    .limit(1);

  return page[0];
}

async function publishDraft(versionId: string) {
  const draft = await db
    .select()
    .from(draftsTable)
    .where(eq(draftsTable.id, versionId))
    .limit(1);

  if (!draft.length) throw new Error("Draft not found");
  if (draft[0].status !== "draft") throw new Error("Not a draft");

  await db.transaction(async (tx) => {
    // Update the main pages table
    await tx
      .update(pagesTable)
      .set({
        parent_id: draft[0].parent_id,
        slug: draft[0].slug,
        title: draft[0].title,
        type: draft[0].type,
        content: draft[0].content,
        description: draft[0].description,
        keywords: draft[0].keywords,
        og_image_ids: draft[0].og_image_ids,
        llm: draft[0].llm,
        no_index: draft[0].no_index,
        no_follow: draft[0].no_follow,
        status: "published",
        updated_at: new Date(),
      })
      .where(eq(pagesTable.id, draft[0].page_id));

    // Mark this version as published
    await tx
      .update(draftsTable)
      .set({
        status: "published",
        is_current_draft: 0,
        published_at: new Date(),
      })
      .where(eq(draftsTable.id, versionId));
  });
}

// Routing
export async function findHomePage() {
  return await db.select().from(pagesTable).where(eq(pagesTable.slug, ""));
}
// Routing
export async function findPageByFullSlug(fullSlug: string) {
  // Split the slug path into segments
  const segments = fullSlug.split("/").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  // Use recursive CTE to match the full path
  const result = await db.execute(sql`
    WITH RECURSIVE page_path AS (
      -- Base case: find root pages with matching first segment
      SELECT
        id,
        slug,
        parent_id,
        ARRAY[slug] as path_array,
        1 as depth
      FROM pages
      WHERE parent_id IS NULL
        AND slug = ${segments[0]}

      UNION ALL

      -- Recursive case: traverse down to children
      SELECT
        p.id,
        p.slug,
        p.parent_id,
        pp.path_array || p.slug,
        pp.depth + 1
      FROM pages p
      INNER JOIN page_path pp ON p.parent_id = pp.id
      WHERE pp.depth < ${segments.length}
    )
    SELECT
      p.id,
      p.parent_id,
      p.slug,
      p.title,
      p.type,
      p.status,
      p.content,
      p.description,
      p.keywords,
      p.og_image_ids,
      p.llm,
      p.no_index,
      p.no_follow,
      p.canonical_url,
      p.created_at,
      p.updated_at
    FROM page_path pp
    INNER JOIN pages p ON pp.id = p.id
    WHERE pp.path_array = ARRAY[${sql.join(
      segments.map((s) => sql`${s}`),
      sql.raw(`, `),
    )}]
    LIMIT 1;
  `);

  return (result.rows[0] as SelectPage) || null;
}

async function getPageWithParent(page_id: string) {
  const result = await db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      parent_id: pagesTable.parent_id,
      content: pagesTable.content,
      created_at: pagesTable.created_at,
      updated_at: pagesTable.updated_at,
      // Join parent page
      parent_title: sql`parent.title`,
      parent_slug: sql`parent.slug`,
    })
    .from(pagesTable)
    .leftJoin(sql`pages as parent`, eq(pagesTable.parent_id, sql`parent.id`))
    .where(eq(pagesTable.id, page_id))
    .limit(1);

  return result[0] || null;
}

/**
 * Usage
 *
 * // PATCH /api/pages/:id
   async updatePage(db: any, pageId: string, data: { slug?: string; parentId?: string }) {
     if (data.slug) {
       await updatePageSlug(db, pageId, data.slug);
     }
     if (data.parentId !== undefined) {
       await changePageParent(db, pageId, data.parentId);
     }
     return { success: true };
   },
 */

// ============================================
// QUERY 6: Update page and invalidate descendants' cache
// (If using cached full_slug approach)
// ============================================
// async function updatePageSlug(page_id: string, newSlug: string) {
//   // Update the page slug
//   await db
//     .update(pagesTable)
//     .set({
//       slug: newSlug,
//       updated_at: new Date(),
//     })
//     .where(eq(pagesTable.id, page_id));

//   // Get all descendant IDs (pages that need cache invalidation)
//   const descendants = await db.execute(sql`
//      WITH RECURSIVE descendants AS (
//        SELECT id FROM pages WHERE id = ${page_id}
//        UNION ALL
//        SELECT p.id FROM pages p
//        INNER JOIN descendants d ON p.parent_id = d.id
//      )
//      SELECT id FROM descendants WHERE id != ${page_id}
//    `);

//   // If you have a full_slug_cache column, regenerate it for all affected pages
//   for (const row of descendants.rows) {
//     const fullSlug = await getPageFullPath(row.id);
//     await db
//       .update(pagesTable)
//       .set({
//         fullSlugCache: fullSlug,
//         updatedAt: new Date(),
//       })
//       .where(eq(pagesTable.id, row.id));
//   }

//   return { updated: true, affectedCount: descendants.rows.length };
// }

// ============================================
// QUERY 7: Change page parent
// ============================================
async function changePageParent(page_id: string, newParentId: string | null) {
  // Prevent circular reference
  if (newParentId) {
    const isCircular = await db.execute(sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id FROM pages WHERE id = ${newParentId}
        UNION ALL
        SELECT p.id, p.parent_id FROM pages p
        INNER JOIN ancestors a ON p.id = a.parent_id
      )
      SELECT EXISTS(SELECT 1 FROM ancestors WHERE id = ${page_id}) as is_circular
    `);

    if (isCircular.rows[0]?.is_circular) {
      throw new Error("Cannot set parent: would create circular reference");
    }
  }

  // Update parent
  await db
    .update(pagesTable)
    .set({
      parent_id: newParentId,
      updated_at: new Date(),
    })
    .where(eq(pagesTable.id, page_id));

  return { updated: true };
}

// ============================================
// QUERY 8: Build full slug for multiple pages at once
// (Useful for building cache or returning search results with paths)
//
// Usage:
// const paths = await buildFullSlugsForPages(['id1', 'id2', 'id3']);
// Returns: [
//   { page_id: 'id1', full_slug: '/products/software' },
//   { page_id: 'id2', full_slug: '/services/consulting' },
// ]
// ============================================
async function buildFullSlugsForPages(page_ids: string[]) {
  if (page_ids.length === 0) return [];

  const result = await db.execute(sql`
    WITH RECURSIVE page_paths AS (
      -- Base case: all target pages
      SELECT
        id,
        slug,
        parent_id,
        slug as path_segment,
        1 as depth,
        id as root_page_id
      FROM pages
      WHERE id = ANY(${page_ids})

      UNION ALL

      -- Recursive case: traverse up to parents
      SELECT
        p.id,
        p.slug,
        p.parent_id,
        p.slug as path_segment,
        pp.depth + 1,
        pp.root_page_id
      FROM pages p
      INNER JOIN page_paths pp ON p.id = pp.parent_id
    )
    SELECT
      root_page_id as page_id,
      '/' || string_agg(path_segment, '/' ORDER BY depth DESC) as full_slug
    FROM page_paths
    GROUP BY root_page_id
  `);

  return result.rows;
}

async function revertToVersion(
  pageId: string,
  versionNumber: number,
  userId: string,
) {
  const targetVersion = await db
    .select()
    .from(draftsTable)
    .where(
      and(
        eq(draftsTable.page_id, pageId),
        eq(draftsTable.version, versionNumber),
      ),
    )
    .limit(1);

  if (!targetVersion.length) throw new Error("Version not found");

  // Create a new draft based on the old version
  const latestVersion = await db
    .select({ version: draftsTable.version })
    .from(draftsTable)
    .where(eq(draftsTable.page_id, pageId))
    .orderBy(desc(draftsTable.version))
    .limit(1);

  const nextVersionNumber = latestVersion[0].version + 1;

  // Mark existing current draft as old
  await db
    .update(draftsTable)
    .set({ is_current_draft: 0 })
    .where(
      and(eq(draftsTable.page_id, pageId), eq(draftsTable.is_current_draft, 1)),
    );

  // Create new draft from old version
  const draftId = generateId();
  await db.insert(draftsTable).values({
    id: draftId,
    page_id: pageId,
    version: nextVersionNumber,
    parent_id: targetVersion[0].parent_id,
    slug: targetVersion[0].slug,
    title: targetVersion[0].title,
    type: targetVersion[0].type,
    content: targetVersion[0].content,
    description: targetVersion[0].description,
    keywords: targetVersion[0].keywords,
    og_image_ids: targetVersion[0].og_image_ids,
    llm: targetVersion[0].llm,
    no_index: targetVersion[0].no_index,
    no_follow: targetVersion[0].no_follow,
    status: "draft",
    is_current_draft: 1,
    created_by: userId,
  });

  return draftId;
}

/***********************************************************************
 * Medias
 */

export async function getMediasByIds(media_ids: string[]) {
  return await db
    .select()
    .from(mediasTable)
    .where(inArray(mediasTable.id, media_ids));
}

/**
 * New schema
 */
// const pages = pgTable("pages", {
//   id: char("id", { length: 32 }).primaryKey(),
//   published_version_id: char("published_version_id", { length: 32 }),
//   draft_version_id: char("draft_version_id", { length: 32 }),
//   slug: text("slug").notNull(),
//   status: text("status"), // NULL, 'published', 'archived'
//   published_at: timestamp("published_at"),
//   created_at: timestamp("created_at").notNull().defaultNow(),
//   updated_at: timestamp("updated_at").notNull().$onUpdate(() => new Date()),
// }, (table) => ({
//   publishedAtIdx: index("published_at_idx").on(table.published_at),
//   statusIdx: index("status_idx").on(table.status),
// }));

// const page_versions = pgTable("page_versions", {
//   id: char("id", { length: 32 }).primaryKey(),
//   page_id: char("page_id", { length: 32 }).notNull().references(() => pages.id, { onDelete: 'cascade' }),
//   version_number: integer("version_number").notNull(),

//   // All content fields
//   parent_id: char("parent_id", { length: 32 }),
//   slug: text("slug").notNull(),
//   title: text("title"),
//   type: text("type"),
//   content: text("content"),
//   description: text("description"),
//   keywords: text("keywords"),
//   og_image_ids: char("og_image_ids", { length: 32 }).array().default(sq`ARRAY[]::char(32)[]`),
//   llm: text("llm"),
//   no_index: integer("no_index"),
//   no_follow: integer("no_follow"),

//   // Version metadata
//   created_by: char("created_by", { length: 32 }),
//   created_at: timestamp("created_at").notNull().defaultNow(),

//   // Optional: why this version was created
//   reason: text("reason"), // 'auto-save', 'manual-save', 'publish', 'revert'
// }, (table) => ({
//   pageVersionIdx: index("page_version_idx").on(table.page_id, table.version_number),
// }));

// // Load page for editing (always loads draft if exists, otherwise published)
// async function loadPageForEditing(pageId: string) {
//   const page = await db
//     .select()
//     .from(pages)
//     .where(eq(pages.id, pageId))
//     .limit(1);

//   if (!page.length) throw new Error('Page not found');

//   // Load draft version if exists
//   if (page[0].draft_version_id) {
//     const version = await db
//       .select()
//       .from(page_versions)
//       .where(eq(page_versions.id, page[0].draft_version_id))
//       .limit(1);
//     return version[0];
//   }

//   // Load published version
//   if (page[0].published_version_id) {
//     const version = await db
//       .select()
//       .from(page_versions)
//       .where(eq(page_versions.id, page[0].published_version_id))
//       .limit(1);
//     return version[0];
//   }

//   throw new Error('No versions found');
// }

// async function listPagesForCMS() {
//   const pagesList = await db
//     .select({
//       id: pages.id,
//       status: pages.status,
//       published_at: pages.published_at,
//       created_at: pages.created_at,
//       updated_at: pages.updated_at,

//       // Published version info
//       published_version_id: pages.published_version_id,
//       published_slug: publishedVersion.slug,
//       published_title: publishedVersion.title,

//       // Draft version info
//       draft_version_id: pages.draft_version_id,
//       draft_slug: draftVersion.slug,
//       draft_title: draftVersion.title,
//       draft_updated_at: draftVersion.created_at,
//     })
//     .from(pages)
//     .leftJoin(
//       publishedVersion,
//       eq(publishedVersion.id, pages.published_version_id)
//     )
//     .leftJoin(
//       draftVersion,
//       eq(draftVersion.id, pages.draft_version_id)
//     )
//     .orderBy(desc(pages.updated_at));

//   return pagesList;
// }

// // Save creates new version, updates draft pointer
// async function saveDraft(pageId: string, updates: PageContent, userId: string) {
//   const page = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
//   if (!page.length) throw new Error('Page not found');

//   // Get next version number
//   const latestVersion = await db
//     .select({ version_number: page_versions.version_number })
//     .from(page_versions)
//     .where(eq(page_versions.page_id, pageId))
//     .orderBy(desc(page_versions.version_number))
//     .limit(1);

//   const nextVersionNumber = latestVersion.length > 0 ? latestVersion[0].version_number + 1 : 1;

//   // Create new version
//   const versionId = generateId();
//   await db.insert(page_versions).values({
//     id: versionId,
//     page_id: pageId,
//     version_number: nextVersionNumber,
//     ...updates,
//     created_by: userId,
//     reason: 'manual-save',
//   });

//   // Update draft pointer
//   await db
//     .update(pages)
//     .set({ draft_version_id: versionId })
//     .where(eq(pages.id, pageId));

//   return versionId;
// }

// // Publish updates published pointer, clears draft pointer
// async function publishDraft(pageId: string) {
//   const page = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
//   if (!page.length || !page[0].draft_version_id) throw new Error('No draft to publish');

//   await db
//     .update(pages)
//     .set({
//       published_version_id: page[0].draft_version_id,
//       draft_version_id: null, // Clear draft pointer
//       status: 'published',
//       published_at: new Date(),
//     })
//     .where(eq(pages.id, pageId));
// }

// // Get all versions (for history view)
// async function getVersionHistory(pageId: string) {
//   return await db
//     .select()
//     .from(page_versions)
//     .where(eq(page_versions.page_id, pageId))
//     .orderBy(desc(page_versions.version_number));
// }
