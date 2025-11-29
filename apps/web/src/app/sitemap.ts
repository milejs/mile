import { generateMileSitemap } from "@milejs/core/app";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const result = await generateMileSitemap();
  return result;
}
