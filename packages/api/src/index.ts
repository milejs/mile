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
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { invariant } from "./invariant";
import { handleRequest, route, type Router } from "@better-upload/server";
import { cloudflare } from "@better-upload/server/clients";
import slugify from "@sindresorhus/slugify";
import { generateId } from "./lib/generate-id";
import {
  createNewPage,
  getPublishedPageByFullSlug,
  getMediasByIds,
  getDraftFullSlug,
  listAllPages,
  listPaginatedPages,
  loadDraftByPageId,
  saveDraft,
  searchPages,
  searchDraftPagesByTitle,
  publishPage,
  loadDraftById,
  generatePreviewToken,
  getPreviewToken,
  listAllPublishedPagesSitemap,
  handleRedirect,
  getRedirectStats,
  getCarouselPosts,
} from "./dao";
import { auth } from "./auth";

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

export function MileAPI(options: MileAPIOptions) {
  const app = new Hono().basePath("/api/mile");
  app.onError((err, c) => {
    console.log("err -------------", err);
    if (err instanceof HTTPException) {
      // Get the custom response
      return err.getResponse();
    }
    return c.json({ error: true, message: err.message ?? "Error" }, 400);
  });

  // auth
  app.on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw));

  app.route("/medias", medias);
  app.route("/pages", pages);
  app.route("/drafts", drafts);
  app.route("/page", frontend);
  app.route("/redirects", redirects);
  app.route("/ui", ui);

  app.get("/handle-redirect", async (c) => {
    const { pathname } = c.req.query();
    if (!pathname) {
      return c.json({ message: "Bad request" }, 400);
    }
    const result = await handleRedirect(pathname);
    return c.json({
      data: result,
    });
  });

  /**
   * Search draft pages by title
   *  - used in SlugInput combobox when selecting parent page
   */
  app.get("/search-parent", async (c) => {
    // For parent picker search
    const { q, page = "1", limit = "30" } = c.req.query();
    const per_page = Math.min(100, parseInt(limit, 10));
    const result = await searchDraftPagesByTitle(q, per_page);
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
    const offset = (page_no - 1) * per_page;
    // Fetch results and total count in parallel
    const [results, totalCount] = await searchPages(q, per_page, offset);
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
const frontend = new Hono();
const drafts = new Hono();
const redirects = new Hono();
const ui = new Hono();

/****************************************************************
 * UIs
 */

// Get posts for carousel
ui.get("/carousel-posts", async (c) => {
  let result = await getCarouselPosts();
  return c.json({
    data: result,
  });
});

/****************************************************************
 * Redirects
 */

// Get page by "/" slug
redirects.get("/", async (c) => {
  let result = await getRedirectStats();
  return c.json({
    data: result,
  });
});

/****************************************************************
 * Page by slug
 */

// Get page by "/" slug
frontend.get("/", async (c) => {
  let [single] = await getPublishedPageByFullSlug("/");
  if (!single) {
    return c.json({ message: "Page not found" }, 404);
  }
  // TODO: should we ensure "published" status?
  // Fetch related media if og_image_ids exist
  let og_images: SelectMedia[] = [];
  if (single.drafts.og_image_ids && single.drafts.og_image_ids.length > 0) {
    og_images = await getMediasByIds(single.drafts.og_image_ids);
  }
  return c.json({
    ...single,
    og_images,
  });
});

// Get page by slug
frontend.get("/:slug{.+}", async (c) => {
  const slug = c.req.param("slug");

  let [single] = await getPublishedPageByFullSlug(`/${slug}`);
  if (!single) {
    return c.json({ message: "Page not found" }, 404);
  }
  // TODO: should we ensure "published" status?
  // Fetch related media if og_image_ids exist
  let og_images: SelectMedia[] = [];
  if (single.drafts.og_image_ids && single.drafts.og_image_ids.length > 0) {
    og_images = await getMediasByIds(single.drafts.og_image_ids);
  }
  return c.json({
    ...single,
    og_images,
  });
});

/****************************************************************
 * Drafts
 */

/**
 * Load draft by token (for preview)
 */
drafts.get("/:token", async (c) => {
  const token = c.req.param("token");
  const preview_token = await getPreviewToken(token);
  if (!preview_token) {
    return c.json({ error: "Invalid or expired preview token" }, 401);
  }
  const single = await loadDraftById(preview_token.draft_id);
  if (!single) {
    return c.json({ message: "Page not found" }, 404);
  }
  let og_images: SelectMedia[] = [];
  if (single.og_image_ids && single.og_image_ids.length > 0) {
    og_images = await getMediasByIds(single.og_image_ids);
  }
  return c.json({
    data: {
      ...single,
      og_images,
    },
    meta: {
      preview_token,
    },
  });
});

drafts.post("/:draft_id/preview-token", async (c) => {
  const draft_id = c.req.param("draft_id");
  const body = await c.req.json();
  const single = await loadDraftById(draft_id);
  if (!single || !body?.page_id) {
    return c.json({ message: "Page not found" }, 404);
  }
  const preview_token = await generatePreviewToken(draft_id, body.page_id);
  return c.json({
    token: preview_token.token,
    draft_id: preview_token.draft_id,
    expires_at: preview_token.expires_at,
  });
});

/****************************************************************
 * Pages
 */

/**
 * List paginated pages
 */
pages.get("/", async (c) => {
  const { page = "1", limit = "30" } = c.req.query();
  const per_page = Math.min(100, parseInt(limit, 10));
  const page_no = Math.max(1, parseInt(page, 10));
  const offset = (page_no - 1) * per_page;

  const [data, totalCount] = await listPaginatedPages(per_page, offset);
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

/**
 * List all pages
 *  - listing all pages in CMS for snappy interaction/ management
 */
pages.get("/all-pages", async (c) => {
  const result = await listAllPages();
  return c.json({
    data: result,
  });
});

/**
 * List all pages for sitemap
 *  - listing all pages in CMS for snappy interaction/ management
 */
pages.get("/all-pages-sitemap", async (c) => {
  const sitemap = await listAllPublishedPagesSitemap();
  return c.json({
    data: sitemap,
  });
});

/**
 * Create new page
 */
pages.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createPageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { message: "Invalid request body", errors: parsed.error.flatten() },
      400,
    );
  }
  const id = await createNewPage(parsed.data, "admin");
  return c.json({ data: id }, 201);
});

/**
 * Build draft full slug
 *  - used in SlugInput when parent is selected
 */
pages.get("/:id/full-path", async (c) => {
  const id = c.req.param("id");
  const full_slug = await getDraftFullSlug(id);
  return c.json({
    data: full_slug,
  });
});

/**
 * Load page by id (for CMS)
 */
pages.get("/:id", async (c) => {
  const id = c.req.param("id");
  const single = await loadDraftByPageId(id);
  if (!single) {
    return c.json({ message: "Page not found" }, 404);
  }
  // Fetch related media if og_image_ids exist
  let og_images: SelectMedia[] = [];
  if (single.drafts.og_image_ids && single.drafts.og_image_ids.length > 0) {
    og_images = await getMediasByIds(single.drafts.og_image_ids);
  }
  return c.json({
    ...single.drafts,
    og_images,
  });
});

/**
 * Saving a draft
 *
 * Saving a draft creates new row in drafts with the passed data.
 *  - generate new id for new row and also overwrite "reason" to "manual-save"
 *  - saveDraft will check for circular references with parent
 */
pages.post("/:id/draft", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  if (!body) {
    return c.json({ error: "Invalid request body" }, 400);
  }
  const { updates, url_changes } = body;
  if (updates && updates.created_at) {
    delete updates.created_at;
  }
  updates.id = generateId();
  updates.reason = "manual-save";
  // add validation similar to the POST route
  const updatedPage = await saveDraft(id, updates, url_changes);
  return c.json({ data: updatedPage });
});

/**
 * Publishing a page
 *
 * Publishing a page saves new draft, calculate full_slug and updates pointer.
 *  - generate new id for new draft and also overwrite "reason" to "publish"
 *  - calculate draft full_slug to be used as published full_slug
 *    - if page:e is under page:m in published version, and under page:n in draft version.
 *    - publishing page:e will construct full_slug as /.../page:n/page:e
 *    - parents of page:n (the /.../ part) is also calculated the same way using the draft version
 */
pages.post("/:id/publish", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  if (!body) {
    return c.json({ error: "Invalid request body" }, 400);
  }
  const { updates, url_changes } = body;
  if (updates && updates.created_at) {
    delete updates.created_at;
  }
  updates.id = generateId();
  updates.reason = "publish";
  // add validation similar to the POST route
  const updatedPage = await publishPage(id, updates, url_changes);
  return c.json({ data: updatedPage });
});

/**
 * Delete page by id (not implemented)
 */
pages.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(pagesTable).where(eq(pagesTable.id, id));
  return c.json({ message: "Page deleted successfully" });
});

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
