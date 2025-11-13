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
import {
  createNewPage,
  findHomePage,
  findPageByFullSlug,
  getMediasByIds,
  getPageFullPath,
  listAllPages,
  listPaginatedPages,
  loadPageById,
  saveDraft,
  searchPages,
  searchPagesByTitle,
} from "./dao";

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
const page_by_slug = new Hono();

/****************************************************************
 * Page by slug
 */

// Get page by "/" slug
page_by_slug.get("/", async (c) => {
  const { preview } = c.req.query();

  let [single] = await findHomePage();
  if (!single) {
    return c.json({ message: "Page not found" }, 404);
  }

  // get the draft if preview mode
  if (preview === "true") {
    [single] = await db
      .select()
      .from(draftsTable)
      .where(
        and(
          eq(draftsTable.page_id, single.id),
          eq(draftsTable.is_current_draft, 1),
        ),
      )
      .limit(1);
    if (!single) {
      return c.json({ message: "Page not found" }, 404);
    }
  } else {
    // published mode must have "published" status
    if (single.status !== "published") {
      return c.json({ message: "Page not found" }, 404);
    }
  }
  // Fetch related media if og_image_ids exist
  let og_images: SelectMedia[] = [];
  if (single.og_image_ids && single.og_image_ids.length > 0) {
    og_images = await getMediasByIds(single.og_image_ids);
  }
  return c.json({
    ...single,
    og_images,
  });
});

// Get page by slug
page_by_slug.get("/:slug{.+}", async (c) => {
  const slug = c.req.param("slug");
  const { preview } = c.req.query();

  let single = await findPageByFullSlug(`/${slug}`);
  if (!single) {
    return c.json({ message: "Page not found" }, 404);
  }
  // get the draft if preview mode
  if (preview === "true") {
    [single] = await db
      .select()
      .from(draftsTable)
      .where(
        and(
          eq(draftsTable.page_id, single.id),
          eq(draftsTable.is_current_draft, 1),
        ),
      )
      .limit(1);
    if (!single) {
      return c.json({ message: "Page not found" }, 404);
    }
  } else {
    // published mode must have "published" status
    if (single.status !== "published") {
      return c.json({ message: "Page not found" }, 404);
    }
  }
  // Fetch related media if og_image_ids exist
  let og_images: SelectMedia[] = [];
  if (single.og_image_ids && single.og_image_ids.length > 0) {
    og_images = await getMediasByIds(single.og_image_ids);
  }
  return c.json({
    ...single,
    og_images,
  });
});

/****************************************************************
 * Pages
 */

// List all pages with pagination
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

pages.get("/all-pages", async (c) => {
  const result = await listAllPages();
  return c.json({
    data: result,
  });
});

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

  if (!single) {
    return c.json({ message: "Page not found" }, 404);
  }
  // Fetch related media if og_image_ids exist
  let og_images: SelectMedia[] = [];
  if (single.og_image_ids && single.og_image_ids.length > 0) {
    og_images = await getMediasByIds(single.og_image_ids);
  }
  return c.json({
    ...single,
    og_images,
  });
});

// Save draft
pages.put("/:id/draft", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  if (body && body.created_at) {
    delete body.created_at;
  }

  // Here you might want to add validation similar to the POST route
  const [updatedPage] = await saveDraft(id, body);
  return c.json(updatedPage);
});

// Update page (not used for now)
pages.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
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
