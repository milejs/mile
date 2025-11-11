import { Hono } from "hono";
import { handle } from "hono/vercel";
import { HTTPException } from "hono/http-exception";
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
import { z } from "zod";
import { invariant } from "./invariant";
import { handleRequest, route, type Router } from "@better-upload/server";
import { cloudflare } from "@better-upload/server/clients";
import slugify from "@sindresorhus/slugify";
import { generateId } from "./lib/generate-id";

type MileAPIOptions = {
  s3?: {
    filePrefix?: string;
  };
};

invariant(
  process.env.CLOUDFLARE_ACCOUNT_ID,
  "CLOUDFLARE_ACCOUNT_ID is required",
);
invariant(process.env.AWS_ACCESS_KEY_ID, "AWS_ACCESS_KEY_ID is required");
invariant(
  process.env.AWS_SECRET_ACCESS_KEY,
  "AWS_SECRET_ACCESS_KEY is required",
);
invariant(process.env.AWS_BUCKET_NAME, "AWS_BUCKET_NAME is required");

const upload_router: Router = {
  // client: s3,
  client: cloudflare({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }),
  bucketName: process.env.AWS_BUCKET_NAME!,
  routes: {
    mileupload: route({
      fileTypes: ["image/*"],
      maxFileSize: 1024 * 1024 * 10, // 10MB
      onBeforeUpload: async ({ req, file, clientMetadata }) => {
        // const session = await auth.current();
        // if (!session) {
        //   throw new RejectUpload('Not logged in!');
        // }
        return {
          objectInfo: {
            key: `mileupload/${slugify(file.name, { preserveCharacters: ["."] })}`,
          },
        };
      },
    }),
    mileuploads: route({
      multipleFiles: true,
      fileTypes: ["image/*"],
      maxFileSize: 1024 * 1024 * 10, // 10MB
      onBeforeUpload: async ({ req, files, clientMetadata }) => {
        // const session = await auth.current();
        // if (!session) {
        //   throw new RejectUpload('Not logged in!');
        // }
        return {
          generateObjectInfo: ({ file }) => ({
            key: `mileupload/${slugify(file.name, { preserveCharacters: ["."] })}`,
          }),
        };
      },
    }),
  },
};

async function searchPagesByTitle(query: string, limit = 20) {
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

export function MileAPI(options: MileAPIOptions) {
  const app = new Hono().basePath("/api/mile");
  app.onError((err, c) => {
    console.log("err", err.message);
    if (err instanceof HTTPException) {
      // Get the custom response
      return err.getResponse();
    }
    return c.json({ error: true, message: err.message ?? "Error" }, 400);
  });

  app.route("/medias", medias);
  app.route("/pages", pages);
  app.route("/page", page_by_slug);
  app.get("/search-parent", async (c) => {
    // For parent picker search
    const { q, page = "1", limit = "30" } = c.req.query();
    const per_page = Math.min(100, parseInt(limit, 10));
    const result = await searchPagesByTitle(q, per_page);
    return c.json({
      query: q,
      data: result,
    });
  });
  app.get("/search", async (c) => {
    const { q, page = "1", limit = "30" } = c.req.query();
    if (!q || typeof q !== "string") {
      return c.json({ message: 'Query parameter "q" is required' }, 400);
    }

    const per_page = Math.min(100, parseInt(limit, 10));
    const page_no = Math.max(1, parseInt(page, 10));
    // Calculate offset
    const offset = (page_no - 1) * per_page;

    const searchCondition = or(
      ilike(pagesTable.title, `%${q}%`),
      ilike(pagesTable.slug, `%${q}%`),
    );

    // Fetch results and total count in parallel
    const [results, totalCount] = await Promise.all([
      // Get paginated results
      db
        .select()
        .from(pagesTable)
        .where(searchCondition)
        .limit(per_page)
        .offset(offset)
        .orderBy(pagesTable.title), // order by title

      // Get total count for pagination
      db
        .select({ count: count() })
        .from(pagesTable)
        .where(searchCondition)
        .then((result) => result[0].count),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(Number(totalCount) / per_page);

    return c.json({
      query: q,
      data: results,
      pagination: {
        current_page: page_no,
        per_page: per_page,
        total_items: Number(totalCount),
        total_pages: totalPages,
        has_next: page_no < totalPages,
        has_prev: page_no > 1,
      },
    });
  });
  app.post("/upload", (c) => {
    return handleRequest(c.req.raw, upload_router);
  });
  app.post("/uploads", (c) => {
    return handleRequest(c.req.raw, upload_router);
  });

  return handle(app);
}

const medias = new Hono();
const pages = new Hono();
const page_by_slug = new Hono();

/****************************************************************
 * Medias
 */

medias.get("/", async (c) => {
  const { offset = "0", limit = "10" } = c.req.query();
  const result = await db
    .select()
    .from(mediasTable)
    .orderBy(desc(mediasTable.created_at))
    .limit(parseInt(limit, 10))
    .offset(parseInt(offset, 10));
  return c.json(result);
});

medias.get("/:id", async (c) => {
  const id = c.req.param("id");
  console.log("GET /:id", id);
  const [single] = await db
    .select()
    .from(mediasTable)
    .where(eq(mediasTable.id, id));
  if (!single) {
    return c.json({ message: "Media not found" }, 404);
  }
  return c.json(single);
});

medias.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createImagesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { message: "Invalid request body", errors: parsed.error.flatten() },
      400,
    );
  }
  const newImages = await db
    .insert(mediasTable)
    .values(parsed.data)
    .returning();
  return c.json(newImages, 201);
});

medias.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  console.log("UPDATE media ---- body", body);
  const [updated] = await db
    .update(mediasTable)
    .set({ ...body })
    .where(eq(mediasTable.id, id))
    .returning();
  return c.json(updated);
});

/****************************************************************
 * Page by slug
 */

// Get page by "/" slug
page_by_slug.get("/", async (c) => {
  console.info("------- home");

  const [single] = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.slug, ""));
  if (!single) {
    return c.json({ message: "Page not found" }, 404);
  }
  // Fetch related media if og_image_ids exist
  let og_images: SelectMedia[] = [];
  if (single.og_image_ids && single.og_image_ids.length > 0) {
    og_images = await db
      .select()
      .from(mediasTable)
      .where(inArray(mediasTable.id, single.og_image_ids));
  }
  const pageWithImages = {
    ...single,
    og_images,
  };
  return c.json(pageWithImages);
});

// Routing
async function findPageByFullSlug(fullSlug: string) {
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
      pp.id,
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
      p.created_at,
      p.updated_at
    FROM page_path pp
    INNER JOIN pages p ON pp.id = p.id
    WHERE pp.path_array = ${segments}
    LIMIT 1
  `);

  return (result.rows[0] as SelectPage) || null;
}

// Get page by slug
page_by_slug.get("/:slug{.+}", async (c) => {
  const slug = c.req.param("slug");
  const single = await findPageByFullSlug(`/${slug}`);
  // const [single] = await db
  //   .select()
  //   .from(pagesTable)
  //   .where(eq(pagesTable.slug, `/${slug}`));
  if (!single) {
    return c.json({ message: "Page not found" }, 404);
  }
  // Fetch related media if og_image_ids exist
  let og_images: SelectMedia[] = [];
  if (single.og_image_ids && single.og_image_ids.length > 0) {
    og_images = await db
      .select()
      .from(mediasTable)
      .where(inArray(mediasTable.id, single.og_image_ids));
  }
  const pageWithImages = {
    ...single,
    og_images,
  };
  return c.json(pageWithImages);
});

/****************************************************************
 * Pages
 */
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
//     const fullSlug = await getPageFullPath(db, row.id);
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

async function loadPageById(
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

// List all pages with pagination
pages.get("/", async (c) => {
  const { page = "1", limit = "30" } = c.req.query();
  const per_page = Math.min(100, parseInt(limit, 10));
  const page_no = Math.max(1, parseInt(page, 10));
  // Calculate offset
  const offset = (page_no - 1) * per_page;
  const [data, totalCount] = await Promise.all([
    // Get the current page of data
    db
      .select()
      .from(pagesTable)
      .limit(per_page)
      .offset(offset)
      .orderBy(desc(pagesTable.created_at)), // or whatever ordering you want

    // Get total count
    db
      .select({ count: count() })
      .from(pagesTable)
      .then((result) => result[0].count),
  ]);
  // Calculate pagination metadata
  const totalPages = Math.ceil(Number(totalCount) / per_page);

  return c.json({
    data,
    pagination: {
      current_page: page_no,
      per_page: per_page,
      total_items: Number(totalCount),
      total_pages: totalPages,
      has_next: page_no < totalPages,
      has_prev: page_no > 1,
    },
  });
});

// Create a page
async function createNewPage(
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

pages.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createPageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { message: "Invalid request body", errors: parsed.error.flatten() },
      400,
    );
  }
  const [newPage] = await createNewPage(parsed.data, "admin");
  return c.json(newPage, 201);
});

// async function getPageFullPath(page_id: string): Promise<string | undefined> {
//   // Use recursive CTE to build full slug path
//   const result = await db.execute(sql`
//     WITH RECURSIVE page_path AS (
//       -- Base case: start with the target page
//       SELECT
//         id,
//         slug,
//         parent_id,
//         slug as path_segment,
//         1 as depth
//       FROM pages
//       WHERE id = ${page_id}

//       UNION ALL

//       -- Recursive case: traverse up to parents
//       SELECT
//         p.id,
//         p.slug,
//         p.parent_id,
//         p.slug as path_segment,
//         pp.depth + 1
//       FROM pages p
//       INNER JOIN page_path pp ON p.id = pp.parent_id
//     )
//     SELECT
//       '/' || string_agg(path_segment, '/' ORDER BY depth DESC) as full_slug
//     FROM page_path
//     GROUP BY true
//   `);

//   if (result.rows.length === 0 || !result.rows[0]) {
//     return undefined;
//   }

//   return (result.rows[0].full_slug as string) || "/";
// }
async function getPageFullPath(pageId: string) {
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

// Get page full path
// - Builds full slug when parent is selected
pages.get("/:id/full-path", async (c) => {
  const id = c.req.param("id");
  const full_path = await getPageFullPath(id);
  return c.json({
    data: full_path,
  });
});

// Get page by id
pages.get("/:id", async (c) => {
  const id = c.req.param("id");
  const { preview, draft_id, version } = c.req.query();
  const single = await loadPageById(id, {
    preview: !!preview,
    draft_id: draft_id,
    version_number: version ? parseInt(version, 10) : undefined,
  });

  // const [single] = await db
  //   .select()
  //   .from(pagesTable)
  //   .where(eq(pagesTable.id, id))
  //   .limit(1);
  if (!single) {
    return c.json({ message: "Page not found" }, 404);
  }
  // Fetch related media if og_image_ids exist
  let og_images: SelectMedia[] = [];
  if (single.og_image_ids && single.og_image_ids.length > 0) {
    og_images = await db
      .select()
      .from(mediasTable)
      .where(inArray(mediasTable.id, single.og_image_ids));
  }
  const pageWithImages = {
    ...single,
    og_images,
  };
  return c.json(pageWithImages);
});

async function saveDraft(page_id: string, updates: Partial<InsertDraft>) {
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

// Update page by id
pages.put("/:id/draft", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  console.log("SAVE draft ---- body", body);
  if (body && body.created_at) {
    delete body.created_at;
  }
  // Here you might want to add validation similar to the POST route
  const [updatedPage] = await saveDraft(id, body);
  return c.json(updatedPage);
});

pages.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  console.log("SAVE page ---- body", body);
  if (body && body.created_at) {
    delete body.created_at;
  }
  // Here you might want to add validation similar to the POST route
  const [updatedPage] = await db
    .update(pagesTable)
    .set({ ...body, updated_at: new Date() })
    .where(eq(pagesTable.id, id))
    .returning();
  return c.json(updatedPage);
});

// Delete page by id
pages.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(pagesTable).where(eq(pagesTable.id, id));
  return c.json({ message: "Page deleted successfully" });
});

/****************************************************************
 * Schema
 */
const createPageSchema = z.object({
  id: z.string(),
  slug: z.string(),
  type: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  parent_id: z.string().nullable().optional(),
  llm: z.string().optional(),
  keywords: z.string().optional(),
  og_image_ids: z.array(z.string()).optional(),
  no_index: z.number().optional(),
  no_follow: z.number().optional(),
});

const imageSchema = z.object({
  id: z.string(),
  type: z.string(),
  size: z.number(),
  filepath: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  title: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  etag: z.string().optional(),
});

const createImagesSchema = z.array(imageSchema);
