import { Hono } from "hono";
import { handle } from "hono/vercel";
import { HTTPException } from "hono/http-exception";
import { db } from "./db/drizzle";
import {
  pages as pagesTable,
  medias as mediasTable,
  SelectPage,
  SelectMedia,
} from "./db/schema";
import { desc, eq, or, ilike, inArray, count } from "drizzle-orm";
import { z } from "zod";
import { handleRequest, type Router, route } from "better-upload/server";
import { cloudflare } from "better-upload/server/helpers";
import { invariant } from "./invariant";
import slugify from "@sindresorhus/slugify";

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

const client = cloudflare({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const upload_router: Router = {
  // client: s3,
  client,
  bucketName: process.env.AWS_BUCKET_NAME!,
  routes: {
    mileupload: route({
      fileTypes: ["image/*"],
      maxFileSize: 1024 * 1024 * 10, // 10MB
      onBeforeUpload: async ({ req, file, clientMetadata }) => {
        // const session = await auth.current();
        // if (!session) {
        //   throw new UploadFileError("Unauthorized");
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
        //   throw new UploadFileError("Unauthorized");
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
  const [single] = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.slug, "/"));
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

// Get page by slug
page_by_slug.get("/:slug{.+}", async (c) => {
  const slug = c.req.param("slug");
  const [single] = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.slug, `/${slug}`));
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
  // const result = await db
  //   .select()
  //   .from(pagesTable)
  //   .orderBy(desc(pagesTable.created_at))
  //   .limit(parseInt(limit, 10))
  //   .offset(parseInt(offset, 10));
  return c.json(result);
});

// Create a page
pages.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createPageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { message: "Invalid request body", errors: parsed.error.flatten() },
      400,
    );
  }
  const [newPage] = await db.insert(pagesTable).values(parsed.data).returning();
  return c.json(newPage, 201);
});

// Get page by id
pages.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [single] = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.id, id))
    .limit(1);
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

// Update page by id
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
  parent_id: z.string().optional(),
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
