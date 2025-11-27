import { Suspense } from "react";
import {
  type MDXComponents,
  MDXRemote,
  type MDXRemoteOptions,
} from "next-mdx-remote-client/rsc";
import { RichtextView } from "./blocks";

export { RichtextView };

const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;

export async function fetchPreviewPage(
  paths?: string[],
  search?: { [key: string]: string | string[] | undefined },
) {
  if (!paths || !paths.length) {
    return { ok: false };
  }
  const url = `${API}/drafts/${paths[0]}`;
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
export async function MilePreview({
  params,
  searchParams,
  components,
}: {
  params: Promise<{ milePreview?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  components: MDXComponents;
}) {
  const milePreview = (await params).milePreview;
  const search = await searchParams;
  const res = await fetchPreviewPage(milePreview, search);

  if (!res.ok) {
    return (
      <div className="">
        Preview Unavailable. Please go back and try preview again.
      </div>
    );
  }

  const meta = res.result.meta;
  const page_data = res.result.data;
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

  const formatExpiry = (date: string) => {
    const expiry = new Date(date);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime(); // ✔️ always a number
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return `${diffHours} hours`;
  };

  return (
    <>
      <div className="z-50 fixed bottom-0 w-full bg-violet-900 text-white text-xs py-1.5 px-4 text-center font-medium select-none">
        Preview Mode (expired at {formatExpiry(meta.expires_at)})
      </div>
      <Suspense fallback={<LoadingComponent />}>
        <MDXRemote
          source={page_data.content}
          options={options}
          components={components}
          onError={ErrorComponent}
        />
      </Suspense>
    </>
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
