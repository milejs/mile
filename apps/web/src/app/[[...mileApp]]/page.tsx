import "@milejs/core/mile.css";
import { App, fetchPageBySlug } from "@milejs/core/app";
import { components } from "./components";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

const HOST_URL = process.env.NEXT_PUBLIC_HOST_URL;
const NEXT_PUBLIC_IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL;

const SITE_NAME = "Supreme Vascular and Interventional Clinic";
const META_DESCRIPTION =
  "Supreme Vascular and Interventional Clinic provides comprehensive management of complex multisystem surgical and medical conditions. This includes neurovascular conditions, vascular diseases, interventional pain management, interventional oncology, and interventional radiology.";
const KEYWORDS =
  "Vascular, Vascular Clinic, Vascular Clinic Singapore, Vascular and Interventional Clinic, Vascular and Interventional Clinic Singapore, Brain Aneurysm, Brain Aneurysm Singapore, Neurovascular, Neurovascular Intervention, Neurovascular Surgery, Neurovascular Surgery Singapore";

export async function generateMetadata(
  { params }: { params: Promise<{ mileApp?: string[] }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  if (!HOST_URL) {
    throw new Error("NEXT_PUBLIC_HOST_URL is not defined");
  }
  // read route params
  const { mileApp } = await params;
  const res = await fetchPageBySlug(mileApp);
  // console.log("res", res);
  if (!res.ok) {
    notFound();
  }
  /**
   * res.result
   * {
       "id": "dc3e0935a93736bfb9d396972b4b425a",
       "parent_id": "bd610273067435e2490b173302d7df8d",
       "slug": "/test2/test-6",
       "title": "test 6",
       "type": "page",
       "content": "...",
       "description": "aaa bbb cccc",
       "keywords": null,
       "llm": null,
       "no_index": null,
       "no_follow": null,
       "created_at": "2025-10-22T14:02:45.275Z",
       "updated_at": "2025-10-31T04:08:05.060Z"
   }
   */
  // console.log("res.result", res.result);

  const { title, description, keywords, no_index, og_images } = res.result;

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];

  const meta: Metadata = {
    title: mileApp === undefined ? SITE_NAME : `${title} - ${SITE_NAME}`,
    description: description ? description : META_DESCRIPTION,
    keywords: keywords ? keywords.split(",") : KEYWORDS,
    metadataBase: new URL(HOST_URL),
    openGraph: {
      title: mileApp === undefined ? SITE_NAME : `${title} - ${SITE_NAME}`,
      description: description ? description : META_DESCRIPTION,
      url: HOST_URL,
      siteName: SITE_NAME,
      images:
        og_images.length > 0
          ? og_images
              .map((og_image: any) => ({
                url: `${NEXT_PUBLIC_IMAGE_URL}/${og_image.filepath}`,
                width: og_image.width ?? 800,
                height: og_image.height ?? 600,
              }))
              .concat(previousImages)
          : previousImages,
      locale: "en_US",
      type: "website",
    },
    // robots: {
    //   index: true,
    //   follow: true,
    // }
  };

  if (no_index === 1) {
    meta.robots = {
      index: false,
    };
  }

  return meta;
}

export default async function Page({
  params,
}: {
  params: Promise<{ mileApp?: string[] }>;
}) {
  // return (
  //   <Providers>
  //     <App params={params} components={components} />
  //   </Providers>
  // );
  return <App params={params} components={components} />;
}
