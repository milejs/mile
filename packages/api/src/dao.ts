import { db } from "./db/drizzle";
import {
  pages as pagesTable,
  drafts as draftsTable,
  medias as mediasTable,
  InsertDraft,
  preview_tokens,
  redirects,
  SelectRedirect,
  redirect_history,
} from "./db/schema";
import {
  desc,
  eq,
  or,
  and,
  ilike,
  inArray,
  count,
  sql,
  gt,
  isNull,
  isNotNull,
  lt,
  ne,
} from "drizzle-orm";
import { generateId } from "./lib/generate-id";

// Aliases for joins
import { alias } from "drizzle-orm/pg-core";
export const publishedVersion = alias(draftsTable, "published_version");
export const draftVersion = alias(draftsTable, "draft_version");

// Search pages in slug's combobox
export async function searchDraftPagesByTitle(query: string, limit = 20) {
  const searchCondition = or(
    ilike(draftVersion.title, `%${query}%`),
    ilike(draftVersion.slug, `%${query}%`),
  );
  const results = await db
    .select({
      id: pagesTable.id,
      title: draftVersion.title,
      slug: draftVersion.slug,
    })
    .from(pagesTable)
    .innerJoin(draftVersion, eq(pagesTable.draft_version_id, draftVersion.id))
    .where(searchCondition)
    .limit(limit);

  return results;
}

// Search pages in CMS
export async function searchPages(query: string, limit = 20, offset = 0) {
  const searchCondition = or(
    ilike(draftVersion.title, `%${query}%`),
    ilike(draftVersion.slug, `%${query}%`),
  );
  const [pagesList, totalCount] = await Promise.all([
    // Get paginated results
    db
      .select({
        id: pagesTable.id,
        status: pagesTable.status,
        created_at: pagesTable.created_at,
        updated_at: pagesTable.updated_at,
        published_at: pagesTable.published_at,
        full_slug: pagesTable.full_slug,

        // Published version
        published_version_id: pagesTable.published_version_id,
        // ignore publishedVersion because it's not used in searchCondition above
        // published_slug: publishedVersion.slug,
        // published_title: publishedVersion.title,
        // published_parent_id: publishedVersion.parent_id,

        // Draft version
        draft_version_id: pagesTable.draft_version_id,
        draft_slug: draftVersion.slug,
        draft_title: draftVersion.title,
        draft_parent_id: draftVersion.parent_id,
        draft_created_at: draftVersion.created_at,
      })
      .from(pagesTable)
      .innerJoin(draftVersion, eq(pagesTable.draft_version_id, draftVersion.id))
      .where(searchCondition)
      .limit(limit)
      .offset(offset)
      .orderBy(draftVersion.title), // order by title

    // Get total count for pagination
    db
      .select({ count: count() })
      .from(pagesTable)
      .innerJoin(draftVersion, eq(pagesTable.draft_version_id, draftVersion.id))
      .where(searchCondition)
      .then((result) => result[0].count),
  ]);

  const results = await pageListDto(pagesList);
  return [results, totalCount];
}

const page_list_columns = {
  id: pagesTable.id,
  status: pagesTable.status,
  created_at: pagesTable.created_at,
  updated_at: pagesTable.updated_at,
  published_at: pagesTable.published_at,
  full_slug: pagesTable.full_slug,

  // Published version
  published_version_id: pagesTable.published_version_id,
  published_slug: publishedVersion.slug,
  published_title: publishedVersion.title,
  published_parent_id: publishedVersion.parent_id,

  // Draft version
  draft_version_id: pagesTable.draft_version_id,
  draft_slug: draftVersion.slug,
  draft_title: draftVersion.title,
  draft_parent_id: draftVersion.parent_id,
  draft_created_at: draftVersion.created_at,
};

async function pageListDto(pagesList: any[]) {
  const results: PageListItem[] = [];

  for (const p of pagesList) {
    let displayFullSlug = p.full_slug;

    // this "if" should be necessary because draft should always exist
    if (p.draft_version_id) {
      try {
        const draftFullSlug = await getDraftFullSlug(p.id);
        displayFullSlug = draftFullSlug || displayFullSlug;
      } catch (e) {
        // Fallback to page full_slug if computation fails
        displayFullSlug = p.full_slug;
      }
    }

    results.push({
      id: p.id,
      title: p.draft_title || p.published_title || "Untitled",
      slug: p.draft_slug || p.published_slug || "",
      parent_id: p.draft_parent_id,
      published_parent_id: p.published_parent_id,
      full_slug: p.full_slug,
      draft_full_slug: displayFullSlug,
      status: p.status || "unpublished",
      has_unpublished_changes:
        p.published_version_id !== null &&
        p.draft_version_id !== p.published_version_id,
      slug_changed:
        displayFullSlug !== p.full_slug && p.published_version_id !== null,
      published_at: p.published_at,
      // draft has only created_at (no updated_at) because it gets created every time editor saves the draft.
      last_edited: p.draft_created_at || p.updated_at,
      created_at: p.created_at,
    });
  }

  return results;
}

// List paginated pages for CMS
export async function listPaginatedPages(limit = 20, offset = 0) {
  const [pagesList, totalCount] = await Promise.all([
    // Get the current page of data
    db
      .select(page_list_columns)
      .from(pagesTable)
      .leftJoin(
        publishedVersion,
        eq(publishedVersion.id, pagesTable.published_version_id),
      )
      .leftJoin(draftVersion, eq(draftVersion.id, pagesTable.draft_version_id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(pagesTable.updated_at)),

    // Get total count
    db
      .select({ count: count() })
      .from(pagesTable)
      .then((result) => result[0].count),
  ]);

  const results = await pageListDto(pagesList);
  return [results, totalCount];
}

export interface PageListItem {
  id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  published_parent_id: string | null;
  full_slug: string | null;
  draft_full_slug: string;
  status: string;
  has_unpublished_changes: boolean;
  slug_changed: boolean;
  published_at: Date | null;
  last_edited: Date;
  created_at: Date;
}

// List all pages for CMS
export async function getCarouselPosts() {
  // First, get all pages
  const pagesList = await db
    .select({
      id: pagesTable.id,
      status: pagesTable.status,
      created_at: pagesTable.created_at,
      updated_at: pagesTable.updated_at,
      published_at: pagesTable.published_at,
      full_slug: pagesTable.full_slug,
      version_id: pagesTable.published_version_id,
      slug: publishedVersion.slug,
      title: publishedVersion.title,
      parent_id: publishedVersion.parent_id,
      og_image_ids: publishedVersion.og_image_ids,
      excerpt: publishedVersion.excerpt,
    })
    .from(pagesTable)
    .leftJoin(
      publishedVersion,
      eq(publishedVersion.id, pagesTable.published_version_id),
    )
    .where(
      and(
        eq(pagesTable.status, "published"),
        eq(publishedVersion.type, "page"),
        ne(publishedVersion.slug, ""),
      ),
    )
    .orderBy(desc(pagesTable.updated_at));
  console.info("pagesList", pagesList);

  // Collect all unique image IDs
  const allImageIds = pagesList
    .flatMap((page) => page.og_image_ids || [])
    .filter((id, index, self) => id && self.indexOf(id) === index);

  // Fetch all images in one query
  const images =
    allImageIds.length > 0
      ? await db
          .select()
          .from(mediasTable)
          .where(inArray(mediasTable.id, allImageIds))
      : [];

  // Create image lookup map
  const imageMap = new Map(images.map((img) => [img.id, img]));

  // Attach images to pages
  const pagesWithImages = pagesList.map((page) => ({
    ...page,
    og_images: (page.og_image_ids || [])
      .map((id) => imageMap.get(id))
      .filter(Boolean),
  }));

  // const results = await pageListDto(pagesWithImages);
  return pagesWithImages;
}

// List all pages for CMS
export async function listAllPages(): Promise<PageListItem[]> {
  const pagesList = await db
    .select(page_list_columns)
    .from(pagesTable)
    .leftJoin(
      publishedVersion,
      eq(publishedVersion.id, pagesTable.published_version_id),
    )
    .leftJoin(draftVersion, eq(draftVersion.id, pagesTable.draft_version_id))
    .orderBy(desc(pagesTable.updated_at));

  const results = await pageListDto(pagesList);
  return results;
}

// get draft's full slug
export async function getDraftFullSlug(
  page_id: string,
): Promise<string | undefined> {
  const versions = await db
    .select({ slug: draftsTable.slug, parent_id: draftsTable.parent_id })
    .from(pagesTable)
    .innerJoin(draftsTable, eq(pagesTable.draft_version_id, draftsTable.id))
    .where(eq(pagesTable.id, page_id));
  if (!versions || versions.length === 0) {
    return undefined;
  }
  const version = versions[0];
  if (version.parent_id == null) {
    return "/" + version.slug;
  } else {
    const parentPath = await getDraftFullSlug(version.parent_id);
    if (!parentPath) {
      return undefined;
    }
    return parentPath + "/" + version.slug;
  }
}

/**
 * Creates a new draft and update page's pointer
 *  - check circular reference
 *  - TODO: [unique slug] check every page (both draft and published) that share the same parent don't have the same slug
 *      check for draft conflict

        SELECT 1
        FROM Pages T1
        JOIN PageVersions T2 ON T1.draft_version_id = T2.id
        WHERE T1.id != :current_page_id  -- this page_id
        AND T2.slug = 'our-team' -- this page's slug
        AND T2.parent_page_id = 1; -- this page's parent_id

        If this returns a row, block the save.

        check for published conflict

        SELECT 1
        FROM Pages T1
        JOIN PageVersions T2 ON T1.published_version_id = T2.id
        WHERE T1.id != :current_page_id -- this page_id
        AND T2.slug = 'our-team' -- this page's slug
        AND T2.parent_page_id = 1; -- this page's parent_id

        If this returns a row, block the save.
        "This slug is already used by the other page. Please choose another."
 */
export async function saveDraft(
  page_id: string,
  updates: InsertDraft,
  url_changes: { slug: boolean; parent_id: boolean },
) {
  // check circular reference with parent_id
  if (updates.parent_id) {
    const is_circular = await checkDraftCircularReference(
      page_id,
      updates.parent_id,
    );
    if (is_circular) {
      throw new Error("circular_reference");
    }
  }

  return await db.transaction(async (tx) => {
    const insert = await tx
      .insert(draftsTable)
      .values({
        ...updates,
        created_at: new Date(),
      })
      .returning();
    const new_draft = insert[0];
    if (!new_draft) {
      throw new Error("Failed to create draft");
    }
    await tx
      .update(pagesTable)
      .set({
        draft_version_id: new_draft.id, // update pointer
        updated_at: new Date(),
      })
      .where(eq(pagesTable.id, page_id));
    return new_draft;
  });
}

/**
 * Publishing a page is just a pointer update.
 *  - save new draft
 *  - calculate draft full_slug
 *  - update published pointer and full_slug
 *
 Now, both the draft and published pointers point to the same version.
 If editor makes a new change, they'll get a new draft_version_id,
 but the published one will remain, pointing to the last published version.
 */
export async function publishPage(
  page_id: string,
  updates: InsertDraft,
  url_changes: { slug: boolean; parent_id: boolean },
) {
  // create new draft
  // at the end of this function, this draft.id will be the published_version_id too.
  const draft = await saveDraft(page_id, updates, url_changes);

  // walk up the tree to calculate draft full_slug to be used for publish full_slug
  let draft_full_slug = await getDraftFullSlug(page_id);

  // create redirects if url changes (for now, we don't use url_changes yet)
  // TODO: check if we can optimize by skip creating redirect if url_changes are both false

  // first, get current page full_slug - this will be old path
  const pages_res = await db
    .select({ full_slug: pagesTable.full_slug })
    .from(pagesTable)
    .where(eq(pagesTable.id, page_id))
    .limit(1);

  const page = pages_res[0];
  if (
    page.full_slug &&
    draft_full_slug &&
    (url_changes.slug || url_changes.parent_id)
  ) {
    const redirect_result = await autoCreateRedirect(
      page.full_slug, // old path
      draft_full_slug, // new path
      page_id,
      "page",
    );
    if (!redirect_result.success) {
      throw new Error(redirect_result.error);
    }
  }

  // update pointer and other status
  await db
    .update(pagesTable)
    .set({
      published_version_id: draft.id,
      full_slug: draft_full_slug,
      status: "published",
      published_at: new Date(),
    })
    .where(eq(pagesTable.id, page_id));

  // TODO: rebuild full_slug for all children if this published page's slug has changed
  //  - find all published drafts that have parent_id point to this page.
  //  - update their full_slug with this page's new slug
  //  - walk down the tree and update the descendants' full_slug with this page's new slug

  return draft;
}

// Create a page
export interface CreatePageData {
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
  canonical_url?: string;
}
export async function createNewPage(
  data: CreatePageData,
  userId: string,
): Promise<string> {
  return await db.transaction(async (tx) => {
    const page_id = data.id;

    // parent_id (optional) points to a pages.id
    // we don't store full_slug at this point (we do it at publish time)
    // but we calculate draft full slug now to check if the slug is not taken
    if (data.parent_id) {
      const draft_parent_full_slug = await getDraftFullSlug(data.parent_id);
      if (draft_parent_full_slug) {
        const full_slug = `${draft_parent_full_slug}/${data.slug}`;
        const page = await getPublishedPageByFullSlug(`${full_slug}`);

        if (page.length > 0) {
          throw new Error(
            `Published page with slug "${full_slug}" already exists. Try again with a different slug.`,
          );
        }
      }
    }

    const version_id = generateId();

    // Create page record
    await tx.insert(pagesTable).values({
      id: page_id,
      draft_version_id: version_id, // point to draft below
      status: null, // Unpublished
    });

    // Create first draft version
    await tx.insert(draftsTable).values({
      id: version_id,
      page_id: page_id, // point to page
      version_number: 1,
      parent_id: data.parent_id || null,
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
      canonical_url: data.canonical_url,
      created_by: userId,
      reason: "create",
    });

    return page_id;
  });
}

// export async function getPageFullPath(pageId: string) {
//   if (!pageId) {
//     return "/";
//   }

//   try {
//     // Use recursive CTE to build full slug path
//     const result = await db.execute(sql`
//         WITH RECURSIVE page_path AS (
//           -- Base case: start with the target page
//           SELECT
//             id,
//             slug,
//             parent_id,
//             ARRAY[slug] as path_segments,
//             1 as depth
//           FROM pages
//           WHERE id = ${pageId}

//           UNION ALL

//           -- Recursive case: traverse up to parents
//           SELECT
//             p.id,
//             p.slug,
//             p.parent_id,
//             ARRAY[p.slug] || pp.path_segments as path_segments,
//             pp.depth + 1
//           FROM pages p
//           INNER JOIN page_path pp ON p.id = pp.parent_id
//           WHERE pp.parent_id IS NOT NULL
//         )
//         SELECT
//           path_segments,
//           depth
//         FROM page_path
//         ORDER BY depth DESC
//         LIMIT 1
//       `);

//     if (!result.rows || result.rows.length === 0) {
//       return null; // Page not found
//     }

//     const segments = (result.rows[0].path_segments as string[]).filter(Boolean); // Remove empty strings
//     return segments.length > 0 ? "/" + segments.join("/") : null;
//   } catch (error) {
//     console.error("Error in getPageFullPath:", error);
//     throw error;
//   }
// }

// Load page for CMS
export async function loadDraftByPageId(page_id: string) {
  const draft = await db
    .select()
    .from(pagesTable)
    .innerJoin(draftsTable, eq(pagesTable.draft_version_id, draftsTable.id))
    .where(eq(pagesTable.id, page_id))
    .limit(1);
  if (draft.length === 0) {
    return undefined;
  }
  return draft[0];
}

// Routing
export async function getPublishedPageByFullSlug(full_slug: string) {
  return await db
    .select()
    .from(pagesTable)
    .innerJoin(draftsTable, eq(pagesTable.published_version_id, draftsTable.id))
    // TODO: should we add 'published' status?
    .where(eq(pagesTable.full_slug, full_slug))
    .limit(1);
}

// Load draft for preview
export async function loadDraftById(draft_id: string) {
  const draft = await db
    .select()
    .from(draftsTable)
    .where(eq(draftsTable.id, draft_id))
    .limit(1);
  if (draft.length === 0) {
    return undefined;
  }
  return draft[0];
}

export async function generatePreviewToken(draft_id: string, page_id: string) {
  // Generate secure random token
  const token = generateId();
  // Token expires in 24 hours
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [single] = await db
    .insert(preview_tokens)
    .values({
      token,
      draft_id,
      page_id,
      expires_at,
    })
    .returning();
  return single;
}

export async function getPreviewToken(token: string) {
  const tokens = await db
    .select()
    .from(preview_tokens)
    .where(
      and(
        eq(preview_tokens.token, token),
        gt(preview_tokens.expires_at, new Date()),
      ),
    );
  if (tokens.length === 0) {
    return undefined;
  }
  return tokens[0];
}

// async function getPageWithParent(page_id: string) {
//   const result = await db
//     .select({
//       id: pagesTable.id,
//       title: pagesTable.title,
//       slug: pagesTable.slug,
//       parent_id: pagesTable.parent_id,
//       content: pagesTable.content,
//       created_at: pagesTable.created_at,
//       updated_at: pagesTable.updated_at,
//       // Join parent page
//       parent_title: sql`parent.title`,
//       parent_slug: sql`parent.slug`,
//     })
//     .from(pagesTable)
//     .leftJoin(sql`pages as parent`, eq(pagesTable.parent_id, sql`parent.id`))
//     .where(eq(pagesTable.id, page_id))
//     .limit(1);

//   return result[0] || null;
// }

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
// async function changePageParent(page_id: string, newParentId: string | null) {
//   // Prevent circular reference
//   if (newParentId) {
//     const isCircular = await db.execute(sql`
//       WITH RECURSIVE ancestors AS (
//         SELECT id, parent_id FROM pages WHERE id = ${newParentId}
//         UNION ALL
//         SELECT p.id, p.parent_id FROM pages p
//         INNER JOIN ancestors a ON p.id = a.parent_id
//       )
//       SELECT EXISTS(SELECT 1 FROM ancestors WHERE id = ${page_id}) as is_circular
//     `);

//     if (isCircular.rows[0]?.is_circular) {
//       throw new Error("Cannot set parent: would create circular reference");
//     }
//   }

//   // Update parent
//   await db
//     .update(pagesTable)
//     .set({
//       parent_id: newParentId,
//       updated_at: new Date(),
//     })
//     .where(eq(pagesTable.id, page_id));

//   return { updated: true };
// }

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
// async function buildFullSlugsForPages(page_ids: string[]) {
//   if (page_ids.length === 0) return [];

//   const result = await db.execute(sql`
//     WITH RECURSIVE page_paths AS (
//       -- Base case: all target pages
//       SELECT
//         id,
//         slug,
//         parent_id,
//         slug as path_segment,
//         1 as depth,
//         id as root_page_id
//       FROM pages
//       WHERE id = ANY(${page_ids})

//       UNION ALL

//       -- Recursive case: traverse up to parents
//       SELECT
//         p.id,
//         p.slug,
//         p.parent_id,
//         p.slug as path_segment,
//         pp.depth + 1,
//         pp.root_page_id
//       FROM pages p
//       INNER JOIN page_paths pp ON p.id = pp.parent_id
//     )
//     SELECT
//       root_page_id as page_id,
//       '/' || string_agg(path_segment, '/' ORDER BY depth DESC) as full_slug
//     FROM page_paths
//     GROUP BY root_page_id
//   `);

//   return result.rows;
// }

// async function revertToVersion(
//   pageId: string,
//   versionNumber: number,
//   userId: string,
// ) {
//   const targetVersion = await db
//     .select()
//     .from(draftsTable)
//     .where(
//       and(
//         eq(draftsTable.page_id, pageId),
//         eq(draftsTable.version, versionNumber),
//       ),
//     )
//     .limit(1);

//   if (!targetVersion.length) throw new Error("Version not found");

//   // Create a new draft based on the old version
//   const latestVersion = await db
//     .select({ version: draftsTable.version })
//     .from(draftsTable)
//     .where(eq(draftsTable.page_id, pageId))
//     .orderBy(desc(draftsTable.version))
//     .limit(1);

//   const nextVersionNumber = latestVersion[0].version + 1;

//   // Mark existing current draft as old
//   await db
//     .update(draftsTable)
//     .set({ is_current_draft: 0 })
//     .where(
//       and(eq(draftsTable.page_id, pageId), eq(draftsTable.is_current_draft, 1)),
//     );

//   // Create new draft from old version
//   const draftId = generateId();
//   await db.insert(draftsTable).values({
//     id: draftId,
//     page_id: pageId,
//     version: nextVersionNumber,
//     parent_id: targetVersion[0].parent_id,
//     slug: targetVersion[0].slug,
//     title: targetVersion[0].title,
//     type: targetVersion[0].type,
//     content: targetVersion[0].content,
//     description: targetVersion[0].description,
//     keywords: targetVersion[0].keywords,
//     og_image_ids: targetVersion[0].og_image_ids,
//     llm: targetVersion[0].llm,
//     no_index: targetVersion[0].no_index,
//     no_follow: targetVersion[0].no_follow,
//     status: "draft",
//     is_current_draft: 1,
//     created_by: userId,
//   });

//   return draftId;
// }

/***********************************************************************
 * Helpers
 */

// Escape regex special characters
// function escapeRegex(str: string): string {
//   return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

/**
 * Check for circular reference when setting parent
 *
 * saving draft of page:b with parent_id: d
 *
 * a
 *   - b // saving draft with parent:d
 *     - c // <-- 2. this is circular (c's parent is b)
 *       - d // <-- 1. start here
 *
 * start with page:d (the new parent), walk up the tree and check if there is parent_id = b
 */
async function checkDraftCircularReference(
  page_id: string,
  new_parent_id: string,
  tx?: any,
): Promise<boolean> {
  const dbConn = tx || db;
  let current_id: string | null = new_parent_id;
  const visited = new Set<string>();

  while (current_id) {
    if (current_id === page_id) {
      return true; // Circular reference detected
    }

    if (visited.has(current_id)) {
      break; // Prevent infinite loop
    }

    visited.add(current_id);

    // walking up the tree
    // @ts-expect-error okk
    const page = await dbConn
      .select({ draft_version_id: pagesTable.draft_version_id })
      .from(pagesTable)
      .where(eq(pagesTable.id, current_id))
      .limit(1);

    if (!page.length || !page[0].draft_version_id) break;
    // @ts-expect-error okk
    const draft = await dbConn
      .select({ parent_id: draftsTable.parent_id })
      .from(draftsTable)
      .where(eq(draftsTable.id, page[0].draft_version_id))
      .limit(1);

    if (!draft.length) break;

    current_id = draft[0].parent_id;
  }

  return false;
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

/***********************************************************************
 * Sitemap
 */

export async function listAllPublishedPagesSitemap() {
  const pages = await db
    .select()
    .from(pagesTable)
    .innerJoin(draftsTable, eq(pagesTable.published_version_id, draftsTable.id))
    .where(eq(pagesTable.status, "published"))
    .orderBy(desc(draftsTable.created_at));

  return pages;
}

/***********************************************************************
 * Redirects
 */

// ============================================================================
// REDIRECT CHAIN DETECTION
// ============================================================================

interface RedirectChain {
  isChain: boolean;
  chain: string[];
  finalDestination: string | null;
  hasLoop: boolean;
}

/**
 * Detects redirect chains and loops
 * @param sourcePath - The starting path
 * @param maxDepth - Maximum chain depth to check (default: 10)
 *
 * For Example 2:
 * chain.chain = ['/product-launch', '/products/widget', '/blog/announcement', '/product-launch']
 * chain.hasLoop = true
 */
async function detectRedirectChain(
  sourcePath: string,
  maxDepth: number = 10,
): Promise<RedirectChain> {
  const visited = new Set<string>();
  const chain: string[] = [sourcePath];
  let currentPath = sourcePath;
  let hasLoop = false;

  for (let depth = 0; depth < maxDepth; depth++) {
    if (visited.has(currentPath)) {
      hasLoop = true;
      break;
    }

    visited.add(currentPath);

    const redirect_res = await db
      .select()
      .from(redirects)
      .where(
        and(
          eq(redirects.source_path, currentPath),
          eq(redirects.is_active, true),
        ),
      );

    if (!redirect_res || redirect_res.length === 0) {
      // No more redirects in chain
      break;
    }

    chain.push(redirect_res[0].destination_path);
    currentPath = redirect_res[0].destination_path;
  }

  return {
    isChain: chain.length > 2,
    chain,
    finalDestination: chain.length > 1 ? chain[chain.length - 1] : null,
    hasLoop,
  };
}

/**
 * Validates that creating a redirect won't cause a loop
 */
async function validateRedirect(
  source_path: string,
  destination_path: string,
): Promise<{ valid: boolean; error?: string }> {
  // Check if destination would redirect back to source
  const chainCheck = await detectRedirectChain(destination_path);

  if (chainCheck.hasLoop) {
    return {
      valid: false,
      error: "Destination path is part of an existing redirect loop",
    };
  }

  if (chainCheck.chain.includes(source_path)) {
    return {
      valid: false,
      error: "This redirect would create a loop",
    };
  }

  // Check for excessive chain depth
  if (chainCheck.chain.length > 5) {
    return {
      valid: false,
      error: `This would create a redirect chain of ${chainCheck.chain.length} redirects (max 5 recommended)`,
    };
  }

  return { valid: true };
}

// ============================================================================
// REDIRECT MIDDLEWARE (Express/Fastify compatible)
// ============================================================================

interface RedirectMiddlewareOptions {
  trackHits?: boolean;
  followChains?: boolean;
  maxChainDepth?: number;
}

/**
 * Handle redirects
 */
export async function handleRedirect(
  requestPath: string,
  options: RedirectMiddlewareOptions = {},
): Promise<{
  status: "continue" | "redirect" | "gone";
  status_code?: number;
  destination_path?: string;
}> {
  const { trackHits = true, followChains = true, maxChainDepth = 5 } = options;

  let currentPath = requestPath;
  const visited = new Set<string>();
  let depth = 0;

  while (depth < maxChainDepth) {
    if (visited.has(currentPath)) {
      // Loop detected, break and continue to 404
      console.error(`Redirect loop detected for path: ${requestPath}`);
      return {
        status: "continue",
      };
    }

    visited.add(currentPath);

    // Find active redirect
    const redirect_res = await db
      .select()
      .from(redirects)
      .where(
        and(
          eq(redirects.source_path, currentPath),
          eq(redirects.is_active, true),
          or(
            isNull(redirects.expires_at),
            gt(redirects.expires_at, new Date()),
          ),
        ),
      );

    if (!redirect_res || redirect_res.length === 0) {
      // No redirect found, continue to next middleware
      return {
        status: "continue",
      };
    }

    const redirect = redirect_res[0];

    // Track hit if enabled
    if (trackHits) {
      // Fire and forget - don't await to avoid slowing down redirect
      db.update(redirects)
        .set({
          hit_count: sql`${redirects.hit_count} + 1`,
          last_hit_at: new Date(),
        })
        .where(eq(redirects.id, redirect.id))
        .catch((err) => console.error("Failed to track redirect hit:", err));
    }

    // Handle 410 Gone
    if (redirect.redirect_type === "gone") {
      return {
        status: "gone",
        status_code: 410,
      };
    }

    // If not following chains, redirect immediately
    if (!followChains) {
      return {
        status: "redirect",
        status_code: redirect.status_code,
        destination_path: redirect.destination_path,
      };
    }

    // Check if destination is also a redirect
    currentPath = redirect.destination_path;
    depth++;

    // If this is the last iteration or destination isn't a redirect, redirect now
    const next_redirect_res = await db
      .select()
      .from(redirects)
      .where(
        and(
          eq(redirects.source_path, currentPath),
          eq(redirects.is_active, true),
        ),
      );

    if (
      !next_redirect_res ||
      next_redirect_res.length === 0 ||
      depth >= maxChainDepth
    ) {
      return {
        status: "redirect",
        status_code: redirect.status_code,
        destination_path: currentPath,
      };
    }
  }

  // No redirect found, continue
  return {
    status: "continue",
  };
}

// ============================================================================
// REDIRECT MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new redirect with validation
 */
async function createRedirect(
  data: Partial<SelectRedirect>,
  userId?: string,
): Promise<{ success: boolean; redirect?: SelectRedirect; error?: string }> {
  try {
    // Normalize paths
    const source_path = normalizePath(data.source_path!);
    const destination_path = normalizePath(data.destination_path!);

    // Validate paths are different
    if (source_path === destination_path) {
      return {
        success: false,
        error: "Source and destination paths cannot be the same",
      };
    }

    // Validate no loops
    const validation = await validateRedirect(source_path, destination_path);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Check for existing redirect
    const existing_res = await db
      .select()
      .from(redirects)
      .where(eq(redirects.source_path, source_path));
    const existing = existing_res[0];

    if (existing) {
      // Update existing redirect
      const [updated] = await db
        .update(redirects)
        .set({
          destination_path,
          redirect_type: data.redirect_type || existing.redirect_type,
          status_code: data.status_code || existing.status_code,
          is_active: data.is_active ?? existing.is_active,
          notes: data.notes || existing.notes,
          updated_at: new Date(),
        })
        .where(eq(redirects.id, existing.id))
        .returning();

      // Log to history
      await db.insert(redirect_history).values({
        redirect_id: existing.id,
        previous_destination: existing.destination_path,
        new_destination: destination_path,
        change_reason: "Updated existing redirect",
        changed_by: userId,
      });

      return { success: true, redirect: updated };
    }

    // Create new redirect
    const [newRedirect] = await db
      .insert(redirects)
      .values({
        ...data,
        source_path,
        destination_path,
        created_by: userId,
      })
      .returning();

    return { success: true, redirect: newRedirect };
  } catch (error) {
    console.error("Failed to create redirect:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Auto-create redirect when content URL changes
 */
export async function autoCreateRedirect(
  oldPath: string,
  newPath: string,
  content_id: string,
  content_type: string,
) {
  const result = await createRedirect({
    source_path: oldPath,
    destination_path: newPath,
    redirect_type: "permanent",
    status_code: 308,
    source: "auto",
    content_id,
    content_type,
    notes: `Auto-created when ${content_type} URL changed`,
  });

  if (!result.success) {
    console.error("Failed to auto-create redirect:", result.error);
  }
  return result;
}

/**
 * Normalize path for consistency
 */
function normalizePath(path: string): string {
  // Remove trailing slash (except for root)
  let normalized = path.replace(/\/+$/, "") || "/";

  // Ensure leading slash
  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized;
  }

  // Remove duplicate slashes
  normalized = normalized.replace(/\/+/g, "/");

  return normalized;
}

/**
 * Clean up expired redirects
 */
export async function cleanupExpiredRedirects(): Promise<number> {
  const result = await db
    .delete(redirects)
    .where(
      and(
        isNotNull(redirects.expires_at),
        lt(redirects.expires_at, new Date()),
      ),
    );

  return result.rowCount || 0;
}

/**
 * Get redirect analytics
 */
export async function getRedirectStats(only_active: boolean = false) {
  if (only_active) {
    return await db
      .select()
      .from(redirects)
      .where(eq(redirects.is_active, true))
      .orderBy(desc(redirects.hit_count));
  }
  return await db.select().from(redirects).orderBy(desc(redirects.hit_count));
}
