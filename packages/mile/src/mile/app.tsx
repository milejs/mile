import { Suspense } from "react";
import {
  type MDXComponents,
  MDXRemote,
  type MDXRemoteOptions,
} from "next-mdx-remote-client/rsc";
import { RichtextView } from "./blocks";
import React from "react";

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
  // const isPreview = search?.preview === "true";
  const url = `${API}/page${slug}`;
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
        source={page_data.drafts.content}
        options={options}
        components={initializeComponents(components)}
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
    <div id="mdx-loading" className="max-w-5xl mx-auto">
      <pre>
        <code>Loading...</code>
      </pre>
    </div>
  );
}

/**
 * Sitemap
 */
export async function generateMileSitemap() {
  const res = await fetch(`${API}/pages/all-pages-sitemap`);
  if (!res.ok) {
    const text = await res.text();
    console.error("error fetching page", text);
    return { ok: false };
  }
  const result = await res.json();
  // console.log("result", result);
  const SITE_URL = process.env.NEXT_PUBLIC_HOST_URL;

  return result.data.map((e: any) => {
    return {
      url: `${SITE_URL}${e.pages.full_slug}`,
      lastModified: e.drafts.created_at,
      changeFrequency: "weekly",
      priority: e.pages.full_slug === "/" ? 1 : 0.7,
    };
  });
}

/**
 * Components
 */
function initializeComponents(components: MDXComponents) {
  return {
    ...components,
    ImageContainer,
    Breadcrumb,
    h1: (props: React.ComponentPropsWithoutRef<"h1">) => (
      <MarkdownBlockContainer>
        <Heading level="1" {...props} />
      </MarkdownBlockContainer>
    ),
    h2: (props: React.ComponentPropsWithoutRef<"h2">) => (
      <MarkdownBlockContainer>
        <Heading level="2" {...props} />
      </MarkdownBlockContainer>
    ),
    h3: (props: React.ComponentPropsWithoutRef<"h3">) => (
      <MarkdownBlockContainer>
        <Heading level="3" {...props} />
      </MarkdownBlockContainer>
    ),
    h4: (props: React.ComponentPropsWithoutRef<"h4">) => (
      <MarkdownBlockContainer>
        <Heading level="4" {...props} />
      </MarkdownBlockContainer>
    ),
    h5: (props: React.ComponentPropsWithoutRef<"h5">) => (
      <MarkdownBlockContainer>
        <Heading level="5" {...props} />
      </MarkdownBlockContainer>
    ),
    h6: (props: React.ComponentPropsWithoutRef<"h6">) => (
      <MarkdownBlockContainer>
        <Heading level="6" {...props} />
      </MarkdownBlockContainer>
    ),
    strong: (props: React.ComponentPropsWithoutRef<"p">) => {
      return <strong {...props} className="font-bold" />;
    },
    p: (props: React.ComponentPropsWithoutRef<"p">) => {
      const { children, ...rest } = props;
      return (
        <MarkdownBlockContainer>
          <p {...rest} className="mb-2.5">
            {newlineToBr(children)}
          </p>
        </MarkdownBlockContainer>
      );
    },
    ul: (props: React.ComponentPropsWithoutRef<"ul">) => (
      <MarkdownBlockContainer>
        <ul {...props} className="list-disc pl-5" />
      </MarkdownBlockContainer>
    ),
    ol: (props: React.ComponentPropsWithoutRef<"ul">) => {
      return (
        <MarkdownBlockContainer>
          <ol {...props} className="list-decimal pl-5" />
        </MarkdownBlockContainer>
      );
    },
    li: (props: React.ComponentPropsWithoutRef<"li">) => {
      return (
        <li {...props} className="/flex">
          <div className="pl-1">{props.children}</div>
        </li>
      );
    },
  };
}

async function Breadcrumb(props: any) {
  const { options } = props ?? {};
  const { page_id } = options ?? {};
  if (!page_id) return;
  const response = await fetch(
    `${API}/ui/breadcrumb/${page_id}?mode=published`,
  );
  const data = await response.json();
  const breadcrumbs = data.map((e: any) => ({
    title: e.title,
    full_slug: e.full_slug,
  }));

  return (
    <div className="px-4 sm:px-0 py-5 w-full">
      <div className="max-w-5xl mx-auto">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            {breadcrumbs.map((breadcrumb: any, index: number) => (
              <li key={index} className="flex items-center gap-2">
                {index === breadcrumbs.length - 1 ? (
                  // Current page - not a link
                  <span className="text-gray-700 font-medium">
                    {breadcrumb.title}
                  </span>
                ) : (
                  // Parent pages - links
                  <>
                    <a
                      href={breadcrumb.full_slug}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {breadcrumb.title}
                    </a>
                    <span className="text-gray-400">/</span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}

function ImageContainer(props: any) {
  const { options } = props;
  if (!options) return null;

  const { images, mode } = options;
  if (!images) return null;

  if (!mode || mode === "list") {
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-y-4">
        {images.map((image: any, index: number) => {
          if (image.image_url) {
            return (
              <div key={index} className="">
                <img
                  src={image.image_url}
                  alt={image.alt_text}
                  className="h-full w-full"
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  return null;
}

function newlineToBr(children: any): any {
  return React.Children.map(children, (child) => {
    // If it's a string -> replace newlines
    if (typeof child === "string") {
      const lines = child.split("\n");
      return (
        <>
          {lines.map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </>
      );
    }

    // If it's a React element, recurse into its children
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        // @ts-expect-error okk
        children: newlineToBr(child.props.children),
      });
    }

    // Anything else: return unchanged
    return child;
  });
}

function Heading(
  props: React.ComponentPropsWithoutRef<
    "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  > & { level: string },
) {
  const { level, ...rest } = props;
  const Tag = `h${level || 2}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <Tag {...rest} className={`mt-6 mb-4 font-bold ${headingSize(level)}`} />
  );
}

function headingSize(level: string) {
  switch (level) {
    case "1":
      return "text-4xl";
    case "2":
      return "text-3xl";
    case "3":
      return "text-2xl";
    case "4":
      return "text-xl";
    case "5":
      return "text-lg";
    case "6":
      return "text-base";
    default:
      return "text-base";
  }
}

function MarkdownBlockContainer(props: any) {
  return (
    <div className="relative px-4 md:px-0 w-full max-w-5xl mx-auto">
      {props.children}
    </div>
  );
}
