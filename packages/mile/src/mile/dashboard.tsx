// import useSWR, { mutate } from "swr";
import { Config, PageMetaData } from "@milejs/types";
import { ReactNode, useEffect, useId, useMemo, useState } from "react";
import slugify from '@sindresorhus/slugify';
import { Button, buttonVariants } from "@/components/ui/button";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, XIcon } from "lucide-react";
import { Dialog } from '@base-ui-components/react/dialog';
import { generateId } from "@/lib/generate-id";
import { Input } from "@/components/ui/input";
import { getAuth } from "./auth";
import useSWR, { mutate } from "swr";
import { Combobox } from '@base-ui-components/react/combobox';

const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;

const fetcher = (key: string[]) => fetch(`${API}${key.join("")}`).then(res => res.json());

/**
 * 
 * [
    {
        "id": "fe4198185b32f23f324cf68b1048ece9",
        "parent_id": null,
        "slug": "/about/team",
        "name": "Team",
        "title": "Team",
        "content": "<Hero id=\"5debb6ff83d67a5f53aecebc4e45546f\" type=\"hero\" className=\"\" options={{title:\"About\",image:{image_url:\"https://pub-47fe340e22e548e5a8ed17dd964ffa4a.r2.dev/mileupload/2024-drive-the-icons-monterey-car-week-tour-2.jpg\",alt_text:\"Side mirror\"},link:{url:\"\",link_text:\"\",is_external:false}}} />",
        "description": null,
        "keywords": null,
        "llm": null,
        "no_index": null,
        "no_follow": null,
        "created_at": "2025-10-08T10:10:27.104Z",
        "updated_at": "2025-10-08T10:10:44.792Z"
    },
    {
        "id": "dc3bbbea4f744220a5e0fe4e96a556cc",
        "parent_id": null,
        "slug": "/about",
        "name": "About",
        "title": "About",
        "content": "<Hero id=\"c88f0ade57ca932cca33889bb095be7b\" type=\"hero\" className=\"\" options={{title:\"Test\",image:{image_url:\"\",alt_text:\"\"},link:{url:\"\",link_text:\"\",is_external:false}}} />",
        "description": null,
        "keywords": null,
        "llm": null,
        "no_index": null,
        "no_follow": null,
        "created_at": "2025-10-08T08:34:35.819Z",
        "updated_at": "2025-10-08T08:34:43.846Z"
    },
    {
        "id": "2950199bae37fa6fb854bd7773fb7fc9",
        "parent_id": null,
        "slug": "/",
        "name": "Home",
        "title": "Home",
        "content": "<Hero id=\"e5472bffdba8d51fe249b704b8e39b2a\" type=\"hero\" className=\"\" options={{title:\"Supreme Vascular and Inter\",image:{image_url:\"https://pub-47fe340e22e548e5a8ed17dd964ffa4a.r2.dev/mileupload/2024-drive-the-icons-monterey-car-week-tour-2.jpg\",alt_text:\"Side mirror\"},link:{url:\"/contact-us\",link_text:\"Book Appointment\",is_external:true}}} />",
        "description": null,
        "keywords": null,
        "llm": null,
        "no_index": null,
        "no_follow": null,
        "created_at": "2025-10-08T03:25:40.216Z",
        "updated_at": "2025-10-08T06:36:29.395Z"
    }
]
 */
export function Dashboard({ path, search }: { path: string; search: { [key: string]: string | string[] | undefined } }) {
  const { data: pages, error: pagesError, isLoading: pagesIsLoading } = useSWR([`/pages`], fetcher);
  console.log('pages', pages);
  if (pagesError) return <div>failed to load</div>
  if (pagesIsLoading) return <div>loading...</div>

  return (
    // <PageWrapper config={config} path={path} search={search}>
    <div className="py-5">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex gap-2 items-center">
          <h1 className="font-bold text-3xl">Pages</h1>
          <CreatePageModal />
        </div>
        <div className="">
          <PagesList data={pages} />
        </div>
      </div>
    </div>
    // </PageWrapper>
  );
}

function PagesList({ data }: { data: any }) {
  if (!data || data.length === 0) {
    return <div className="">No pages</div>;
  }
  return (
    <div className="">
      {data.map((e: any) => {
        return <PageItem key={e.id} data={e} />;
      })}
    </div>
  );
}

function PageItem({ data }: { data: any }) {
  const href = `/mile/${data.id}/edit`;
  return (
    <div className="flex flex-row">
      <div className="w-48 shrink-0">
        <a href={href}>{data.slug}</a>
      </div>
      <div className="truncate grow-1 w-full">
        <a href={href}>{data.title ?? "No title"}</a>
      </div>
      <div className="w-48 shrink-0">
        {new Date(data.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

function CreatePageModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger className="h-9 flex items-center justify-center gap-x-1 rounded-md border border-zinc-300 bg-zinc-50 px-3.5 text-sm font-medium text-zinc-900 select-none hover:bg-zinc-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-zinc-100">
        New <PlusIcon size={16} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-20 transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 /-mt-8 w-lg max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-zinc-50 p-6 text-zinc-900 outline-1 outline-zinc-200 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
          <Dialog.Title className="-mt-1.5 mb-1 text-lg font-medium">
            Create New Page
          </Dialog.Title>
          <div className="overflow-y-auto h-full">
            <NewPageSettings close={() => { setIsOpen(false) }} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function createPage(data: { [k: string]: any }) {
  return mutate(
    ["/pages"],
    async (pages: any) => {
      const resp = await fetch(`${API}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!resp.ok) {
        const error = new Error("An error occurred while creating the page.");
        const info = await resp.json();
        console.error("Error creating page", info);
        // @ts-expect-error okk
        error.info = info;
        // @ts-expect-error okk
        error.status = resp.status;
        throw error;
      }
      const result = await resp.json();
      return [...pages, result];
    },
    // { revalidate: false },
  );
}

type LocalPageMetaData = Omit<PageMetaData, "slug"> & {
  own_slug: string;
  parent?: ParentPageValue | null;
}

function buildParentItems(parents: any[]): ParentPageValue[] {
  return parents.map((e) => {
    return {
      id: e.id,
      value: e.slug,
      label: e.title,
    }
  })
}

function NewPageSettings({ close }: any) {
  const [pageData, setPageData] = useState<LocalPageMetaData>({
    id: "_notused_",
    title: "",
    own_slug: "/",
    parent: {
      id: "",
      value: "",
      label: "",
    },
    parent_id: null,
  });
  const [error, setError] = useState<string | null>(null);

  function handleTitleChange(event: any) {
    setPageData((e) => {
      return { ...e, title: event.target.value };
    });
  }

  function handleOwnSlugChange(event: any) {
    setPageData((e) => {
      return { ...e, own_slug: event.target.value };
    });
  }

  function handleParentSlugChange(v?: ParentPageValue | null) {
    setPageData((e) => {
      return { ...e, parent: v };
    });
  }

  function handleAutoSlug() {
    setPageData((e) => {
      if (!e.title) {
        return e;
      }
      return { ...e, own_slug: `/${slugify(e.title)}` };
    });
  }

  async function handleCreatePage() {
    const pageId = generateId();
    // validate
    if (pageData.title === "") {
      setError("Title is required.");
      return;
    }
    if (pageData.own_slug === "") {
      setError("Slug is required.");
      return;
    }
    if (pageData.own_slug !== "/" && pageData.own_slug.at(0) !== "/") {
      setError("Slug must start with slash e.g. /good-slug");
      return;
    }
    if (pageData.own_slug !== "/" && pageData.own_slug.slice(-1) === "/") {
      setError("Slug cannot end with slash e.g. /bad-slug/");
      return;
    }
    setError(null);
    function buildPageSlug(data: LocalPageMetaData) {
      return data.parent ? `${data.parent.value === "/" ? "" : data.parent.value}${data.own_slug}` : data.own_slug;
    }
    function buildPageParentId(data: LocalPageMetaData) {
      if (data.parent) {
        if (data.parent.value === "/" || data.parent.value === "") {
          return undefined
        }
        return data.parent.id;
      }
      return undefined;
    }
    const payload = {
      id: pageId,
      title: pageData.title?.trim(),
      slug: buildPageSlug(pageData),
      parent_id: buildPageParentId(pageData),
      // description
      // keywords
      // llm
      // no_index
      // no_follow
    }
    console.log('payload', pageData, payload);
    await createPage(payload)
      .then((e) => {
        console.log('e', e);
        close();
      })
      .catch((e) => {
        let message = e.info?.message ? `${e.message} ${e.info.message}` : e.message;
        setError(message);
      });
  }

  return (
    <div className="flex py-8 h-full">
      <div className="w-full flex flex-col items-center gap-y-4">
        <div className="w-full">
          <label htmlFor="title" className="font-semibold text-sm">Title</label>
          <Input
            id="title"
            value={pageData.title}
            onChange={handleTitleChange}
            placeholder="e.g. About us"
          />
          <div className="mt-1 text-xs text-zinc-600">Title of the page displayed on the browser</div>
        </div>
        <div className="w-full relative">
          <SlugInput pageData={pageData} handleParentSlugChange={handleParentSlugChange} handleOwnSlugChange={handleOwnSlugChange} />
          <div className="absolute right-0 -top-1.5">
            <button
              type="button"
              onClick={() => {
                handleAutoSlug();
              }}
              className="text-xs leading-none px-2 py-1 bg-zinc-100 border border-zinc-200 hover:bg-zinc-200/70 text-zinc-600 hover:text-zinc-900 rounded"
            >
              Auto
            </button>
          </div>
        </div>
        <div className="mt-4 w-full">
          {error ? <div className="mb-2 text-xs text-red-600">{error}</div> : null}
          <Button
            onClick={handleCreatePage}
            className="w-full py-3 text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
          >
            Create page
          </Button>
        </div>
      </div>
    </div>
  );
}

function SlugInput({ pageData, handleParentSlugChange, handleOwnSlugChange }: { pageData: LocalPageMetaData; handleParentSlugChange: (v?: ParentPageValue | null) => void; handleOwnSlugChange: (event: any) => void }) {
  const { data: all_pages, error: parentsError, isLoading: parentsIsLoading } = useSWR([`/pages`], fetcher);
  const memoParents = useMemo(() => {
    if (all_pages && all_pages.length > 0) {
      const parents = all_pages
        // .filter((e: any) => {
        //   return e.slug !== `${pageData.parent?.value}${pageData.own_slug}`
        // })
        .map((e: any) => {
          if (e.slug === "/") {
            return { ...e, title: "Root" }
          }
          return e;
        }).sort((a: any, b: any) => {
          if (a.slug === "/") return -1;
          if (b.slug === "/") return 1;
          return 0; // keep original order otherwise
        });
      return buildParentItems(parents);
    }
    return [];
  }, [all_pages]);

  // value is pageData.parent but we need to get from memoParents 
  // to get the referentially equal object so that the Combobox list item is highlighted
  const value = memoParents.find(e => e.value === pageData.parent?.value) ?? null;

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-y-1">
        <label htmlFor="slug" className="font-semibold text-sm">Slug</label>
        <div className="">
          <code className="text-sm text-zinc-700"><span className="bg-blue-100">{pageData.parent?.value ? pageData.parent.value === "/" ? "" : pageData.parent.value : ""}</span>{`${pageData.own_slug}`}</code>
        </div>
        <Input
          id="slug"
          value={pageData.own_slug}
          onChange={handleOwnSlugChange}
          placeholder="e.g. /about-us"
        />
      </div>

      {memoParents.length > 0 && <ParentPicker items={memoParents} value={value} setValue={handleParentSlugChange} />}
    </div>
  )
}

type ParentPageValue = {
  id: string;
  value: string;
  label: string;
}
function ParentPicker({ items, value, setValue }: { items: ParentPageValue[]; value: ParentPageValue | null | undefined; setValue: (v: ParentPageValue | null | undefined) => void; }) {
  const comboboxid = useId();

  return (
    <div className="flex flex-col gap-y-1">
      <h3 className="font-semibold text-sm">Parent page</h3>
      <Combobox.Root items={items} value={value} onValueChange={(v) => setValue(v)}>
        <Combobox.Trigger className="flex pr-3 pl-3.5 h-9 /w-[120px] rounded-md border border-zinc-200 items-center justify-between gap-3 text-base text-zinc-900 select-none hover:bg-zinc-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 data-[popup-open]:bg-zinc-100 cursor-default">
          <div className="">
            <div className="text-sm truncate">{value && value.label ? value.label : "Select.."}</div>
          </div>
          <Combobox.Icon className="flex">
            <ChevronsUpDownIcon size={14} />
          </Combobox.Icon>
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner align="start" sideOffset={4}>
            <Combobox.Popup
              className="w-md [--input-container-height:3rem] origin-[var(--transform-origin)] max-w-[var(--available-width)] max-h-[24rem] rounded-lg bg-[canvas] shadow-lg shadow-zinc-200 text-zinc-900 outline-1 outline-zinc-200 transition-[transform,scale,opacity] data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0"
              aria-label="Select parent page"
            >
              <div className="w-full h-[var(--input-container-height)] text-center p-2">
                <Combobox.Input
                  id={comboboxid}
                  placeholder="e.g. About us"
                  className="h-9 w-full font-normal rounded-md border border-zinc-200 pl-3.5 text-sm text-zinc-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
                />
              </div>
              <Combobox.Empty className="p-4 text-[0.925rem] leading-4 text-zinc-600 empty:m-0 empty:p-0">
                No parent pages found.
              </Combobox.Empty>
              <Combobox.List className="overflow-y-auto scroll-py-2 py-2 overscroll-contain max-h-[min(calc(24rem-var(--input-container-height)),calc(var(--available-height)-var(--input-container-height)))] empty:p-0">
                {(item: any) => {
                  return (
                    <Combobox.Item
                      key={item.value}
                      value={item}
                      className="grid min-w-[var(--anchor-width)] cursor-default grid-cols-[0.75rem_1fr] items-start gap-2 py-2 pr-8 pl-4 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-zinc-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-2 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-zinc-900"
                    >
                      <Combobox.ItemIndicator className="col-start-1">
                        <CheckIcon className="size-3" />
                      </Combobox.ItemIndicator>
                      <div className="col-start-2 flex items-start gap-x-1.5">
                        <span className="font-medium">{item.label ?? "Unknown"}</span>
                        <span className="text-xs text-zinc-500">{item.value ?? ""}</span>
                      </div>
                    </Combobox.Item>
                  )
                }}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
        <div className="mt-1 text-xs text-zinc-600">The URL of the page starts with / (typically from the title)</div>
      </Combobox.Root>
    </div>
  )
}

/**
 * AuthWrapper renders nothing unless user has a valid auth
 * @returns 
 */
function PageWrapper(props: {
  config: Config;
  children: ReactNode;
  path: string;
  search: { [key: string]: string | string[] | undefined };
}) {
  console.log('path=====', props.path, props.search);
  if (props.path === "/setup") {
    return <MileGithubSetup config={props.config} />
  }
  if (props.path === "/created-github-app") {
    return <CreatedGitHubApp config={props.config} search={props.search} />
  }
  return (
    <AuthWrapper config={props.config}>{props.children}</AuthWrapper>
  )
}

function CreatedGitHubApp({ config, search }: { config: Config; search: { [key: string]: string | string[] | undefined }; }) {
  return (
    <div className="py-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">You've installed Mile! 🎉</h1>
      <div className="mt-4">To start using Mile, you need to install the GitHub app you've created.</div>

      <div className="mt-3 space-y-2">
        <div className="">
          Make sure to add the App to the <code>{config.storage.repo}</code> repository.
        </div>
        <InstallGitHubApp config={config} search={search} />
      </div>
    </div>
  );
}

function InstallGitHubApp({ config, search }: { config: Config; search: { [key: string]: string | string[] | undefined }; }) {
  return (
    <div className="">
      <a
        href={`https://github.com/apps/${search.slug}/installations/new`}
        className={`${buttonVariants()}`}
      >
        Install GitHub App
      </a>
    </div>
  )
}

function MileGithubSetup({ config }: { config: Config }) {
  const [deployedURL, setDeployedURL] = useState('');
  const [organization, setOrganization] = useState('');

  return (
    <div className="py-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Mile GitHub Setup</h1>
      <div className="">Create GitHub App</div>
      <form
        action={`https://github.com${organization ? `/organizations/${organization}` : ''}/settings/apps/new`}
        method="post"
        className="mt-8 space-y-4"
      >
        <div className="">
          <label className="block font-medium mb-1" htmlFor="deployedURL">Deployed App URL</label>
          <Input
            id="deployedURL"
            value={deployedURL}
            onChange={(e) => setDeployedURL(e.target.value)}
          />
          <div className="text-xs">This should the root of your domain. If you're not sure where Mile will be deployed, leave this blank and you can update the GitHub app later.</div>
        </div>

        <div className="">
          <label className="block font-medium mb-1" htmlFor="organization">GitHub organization (if any)</label>
          <Input
            id="organization"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />
          <div className="text-xs">You must be an owner or GitHub App manager in the organization to create the GitHub App. Leave this blank to create the app in your personal account.</div>
        </div>

        <input
          type="text"
          name="manifest"
          style={{ display: 'none' }}
          value={JSON.stringify({
            name: `${parseRepoConfig(config.storage.repo).owner
              } Mile`,
            url: deployedURL
              ? new URL('/mile', deployedURL).toString()
              : `${window.location.origin}/mile`,
            public: true,
            redirect_url: `${window.location.origin}/api/mile/github/created-app`,
            callback_urls: [
              `${window.location.origin}/api/mile/github/oauth/callback`,
              `http://127.0.0.1/api/mile/github/oauth/callback`,
              ...(deployedURL
                ? [
                  new URL(
                    '/api/mile/github/oauth/callback',
                    deployedURL
                  ).toString(),
                ]
                : []),
            ],
            request_oauth_on_install: true,
            default_permissions: {
              contents: 'write',
              metadata: 'read',
              pull_requests: 'read',
            },
          })}
        />
        <Button type="submit">
          Create GitHub App
        </Button>
      </form>
    </div>
  )
}

function parseRepoConfig(repo: string) {
  const [owner, name] = repo.split('/');
  return { owner, name };
}

/**
 * AuthWrapper renders nothing unless user has a valid auth
 * @returns 
 */
function AuthWrapper(props: {
  config: Config;
  children: ReactNode;
}) {
  const [state, setState] = useState<'unknown' | 'valid' | 'explicit-auth'>(
    'unknown'
  );
  useEffect(() => {
    getAuth(props.config).then(auth => {
      if (auth) {
        setState('valid');
        return;
      }
      setState('explicit-auth');
    });
  }, [props.config]);

  if (state === 'valid') {
    return props.children;
  }

  if (state === 'explicit-auth') {
    if (props.config.storage.kind === 'github') {
      return (
        <div className="flex items-center justify-center h-screen">
          <a
            href={`/api/mile/github/login`}
            target="_top"
            className="flex flex-row items-center gap-x-1"
          >
            <GithubIcon />
            <div>Log in with GitHub</div>
          </a>
        </div>
      );
    }
  }

  return null;
}

const GithubIcon = ({ width, height }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={width ?? "24"} height={height ?? "24"} viewBox="0 0 24 24">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);


