import { Suspense } from "react";
import {
  type MDXComponents,
  MDXRemote,
  type MDXRemoteOptions,
} from "next-mdx-remote-client/rsc";
import { RichtextView } from "./blocks";

export { RichtextView };

const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;

function getSlug(paths: string[] | undefined) {
  return paths === undefined ? "/" : `/${paths.join("/")}`;
}

export async function fetchPageBySlug(
  paths?: string[],
  search?: { [key: string]: string | string[] | undefined },
) {
  const slug = getSlug(paths);
  const isPreview = search?.preview === "true";
  const url = `${API}/page${slug}${isPreview ? "?preview=true" : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error("error fetching page", text);
    return { ok: false };
  }
  const result = await res.json();
  return { ok: true, result };
}

/**
 * App renders the page. Supply mdx `source` string to MDXRemote.
 *
 * @param params - contains the url path mileApp?: string[]
 * @param components - bag of components. see https://mdxjs.com/table-of-components/
 */
export async function App({
  params,
  searchParams,
  components,
}: {
  params: Promise<{ mileApp?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  components: MDXComponents;
}) {
  const mileApp = (await params).mileApp;
  const search = await searchParams;
  const res = await fetchPageBySlug(mileApp, search);
  if (!res.ok) {
    return <div className="">Not found</div>;
  }

  const page_data = res.result;
  /**
   * {
      "id": "93a559b7-b76e-427f-bd94-be3d21332871",
      "parent_id": null,
      "slug": "/",
      "name": "Home",
      "title": "Home",
      "content": "<Hero id=\"65793fe2-2fe8-4184-b6da-61fe0855db1f\" type=\"hero\" className=\"\" options={{title:\"Supreme Vascular and Interventional Clinic\",image:{image_url:\"https://pub-47fe340e22e548e5a8ed17dd964ffa4a.r2.dev/mileupload/2024-drive-the-icons-monterey-car-week-tour-1-jpg\",alt_text:\"\"},link:{url:\"/contact\",link_text:\"Arrange Your Appointment\",is_external:false}}} />",
      "description": null,
      "keywords": null,
      "llm": null,
      "no_index": null,
      "no_follow": null,
      "created_at": "2025-10-03T09:46:59.892Z",
      "updated_at": "2025-10-06T03:17:31.923Z"
    }
   */
  // console.log("page_data", page_data);
  if (!page_data) return <div className="">No content</div>;

  const options: MDXRemoteOptions = {
    mdxOptions: {
      // ...
    },
    parseFrontmatter: true,
    // scope: {
    //   readingTime: calculateSomeHow(source),
    // },
  };

  return (
    <Suspense fallback={<LoadingComponent />}>
      <MDXRemote
        source={page_data.content}
        options={options}
        components={components}
        onError={ErrorComponent}
      />
    </Suspense>
  );
}

function ErrorComponent({ error }: { error: Error | string }) {
  return (
    <div id="mdx-error">
      <pre style={{ color: "var(--error)" }}>
        <code>{typeof error === "string" ? error : error.message}</code>
      </pre>
    </div>
  );
}

function LoadingComponent() {
  return (
    <div id="mdx-loading">
      <pre>
        <code>Loading...</code>
      </pre>
    </div>
  );
}
