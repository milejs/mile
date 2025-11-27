import "@milejs/core/mile.css";
import { MilePreview, fetchPreviewPage } from "@milejs/core/preview";
import { components } from "../../[[...mileApp]]/components";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

const HOST_URL = process.env.NEXT_PUBLIC_HOST_URL;
const NEXT_PUBLIC_IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL;

const SITE_NAME = "Supreme Vascular and Interventional Clinic";
const META_DESCRIPTION =
  "Supreme Vascular and Interventional Clinic provides comprehensive management of complex multisystem surgical and medical conditions. This includes neurovascular conditions, vascular diseases, interventional pain management, interventional oncology, and interventional radiology.";
const KEYWORDS =
  "Vascular, Vascular Clinic, Vascular Clinic Singapore, Vascular and Interventional Clinic, Vascular and Interventional Clinic Singapore, Brain Aneurysm, Brain Aneurysm Singapore, Neurovascular, Neurovascular Intervention, Neurovascular Surgery, Neurovascular Surgery Singapore";

type Props = {
  params: Promise<{ milePreview?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  if (!HOST_URL) {
    throw new Error("NEXT_PUBLIC_HOST_URL is not defined");
  }
  // read route params
  const { milePreview } = await params;
  const search = await searchParams;
  const res = await fetchPreviewPage(milePreview, search);
  if (!res.ok) {
    notFound();
  }
  // console.log("res.result", res.result);
  const path = milePreview ? milePreview.join("/") : "";
  const { title, description, keywords, no_index, og_images, canonical_url } =
    res.result.data;

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];

  const meta: Metadata = {
    title: milePreview === undefined ? SITE_NAME : `${title} - ${SITE_NAME}`,
    description: description ? description : META_DESCRIPTION,
    keywords: keywords ? keywords.split(",") : KEYWORDS,
    metadataBase: new URL(HOST_URL),
    alternates: {
      canonical: canonical_url ? canonical_url : `${HOST_URL}/${path}`,
    },
    openGraph: {
      title: milePreview === undefined ? SITE_NAME : `${title} - ${SITE_NAME}`,
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
    robots: {
      index: false,
      follow: false,
    },
  };

  return meta;
}

export default async function Page({ params, searchParams }: Props) {
  return (
    <>
      <Topbar />
      <MilePreview
        params={params}
        searchParams={searchParams}
        components={components}
      />
      <Footer />
    </>
  );
}

function Topbar() {
  return (
    <div className="bg-gray-100 p-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">Topbar</h1>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="bg-gray-100 p-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">Footer</h1>
      </div>
    </div>
  );
}
