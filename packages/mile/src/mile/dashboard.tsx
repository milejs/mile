// import useSWR, { mutate } from "swr";
import { Config, PageMetaData } from "@milejs/types";
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import slugify from '@sindresorhus/slugify';
import { Button, buttonVariants } from "@/components/ui/button";
import { CheckIcon, ChevronDownIcon, PlusIcon, XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { generateId } from "@/lib/generate-id";
import { Input } from "@/components/ui/input";
import { getAuth } from "./auth";
import useSWR, { mutate } from "swr";
import { Combobox } from '@base-ui-components/react/combobox';

const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;

const fetcher = (key: string[]) => fetch(`${API}${key.join("")}`).then(res => res.json());

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="flex gap-1 items-center bg-zinc-100 px-3 py-1 text-sm rounded-md border border-zinc-400 hover:border-zinc-500">
        New <PlusIcon size={16} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Page</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto h-full">
          <NewPageSettings
            close={() => {
              setIsOpen(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
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

function NewPageSettings({ close }: any) {
  const comboboxid = useId();
  const { data: parents, error: parentsError, isLoading: parentsIsLoading } = useSWR([`/pages`], fetcher);
  const [pageData, setPageData] = useState<PageMetaData>({
    id: "_notused_",
    name: "",
    title: "",
    slug: "/",
    parent_id: null,
  });
  const dummyRef = useRef({ id: "_notused_", title: "", slug: "/", parent_id: null });
  const [error, setError] = useState<string | null>(null);

  function handleTitleChange(event: any) {
    setPageData((e) => {
      return { ...e, title: event.target.value };
    });
  }

  function handleNameChange(event: any) {
    setPageData((e) => {
      return { ...e, name: event.target.value };
    });
  }

  function handleSlugChange(event: any) {
    setPageData((e) => {
      return { ...e, slug: event.target.value };
    });
  }

  function handleAutoSlug() {
    setPageData((e) => {
      if (!e.title) {
        return e;
      }
      return { ...e, slug: `/${slugify(e.title)}` };
    });
  }

  async function handleCreatePage() {
    const pageId = generateId();
    // validate
    if (pageData.name === "") {
      setError("Name is required.");
      return;
    }
    if (pageData.title === "") {
      setError("Title is required.");
      return;
    }
    if (pageData.slug === "") {
      setError("Slug is required.");
      return;
    }
    if (pageData.slug !== "/" && pageData.slug.slice(-1) === "/") {
      setError("Slug cannot end with slash e.g. /my-slug/");
      return;
    }
    setError(null);
    await createPage({
      id: pageId,
      title: pageData.title?.trim(),
      name: pageData.title?.trim(),
      slug: pageData.slug.trim(),
      parent_id: pageData.parent_id?.trim(),
    })
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
      <div className="w-full flex flex-col justify-center items-center gap-y-4">
        <div className="w-full">
          <label htmlFor="name" className="font-semibold text-sm">Name</label>
          <Input
            id="name"
            value={pageData.name}
            onChange={handleNameChange}
            placeholder="e.g. About us"
          />
          <div className="mt-1 text-xs text-zinc-600">Nickname only you see</div>
        </div>
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
          <label htmlFor="slug" className="font-semibold text-sm">Slug</label>
          <div className="flex">
            {parents.length > 0 && (
              <Combobox.Root items={parents}>
                <div className="relative flex flex-col gap-1 text-sm leading-5 font-medium text-zinc-900">
                  <Combobox.Input
                    placeholder="e.g. Apple"
                    id={comboboxid}
                    className="h-9 rounded-l-md border border-zinc-200 pl-3.5 text-base text-zinc-900 bg-[canvas] focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
                  />
                  <div className="absolute right-2 bottom-0 flex h-10 items-center justify-center text-zinc-600">
                    <Combobox.Clear
                      className="flex h-10 w-6 items-center justify-center rounded bg-transparent p-0"
                      aria-label="Clear selection"
                    >
                      <XIcon className="size-4" />
                    </Combobox.Clear>
                    <Combobox.Trigger
                      className="flex h-10 w-6 items-center justify-center rounded bg-transparent p-0"
                      aria-label="Open popup"
                    >
                      <ChevronDownIcon className="size-4" />
                    </Combobox.Trigger>
                  </div>
                </div>

                <Combobox.Portal>
                  <Combobox.Positioner className="outline-none" sideOffset={4}>
                    <Combobox.Popup className="w-[var(--anchor-width)] max-h-[min(var(--available-height),23rem)] max-w-[var(--available-width)] origin-[var(--transform-origin)] overflow-y-auto scroll-pt-2 scroll-pb-2 overscroll-contain rounded-md bg-[canvas] py-2 text-zinc-900 shadow-lg shadow-zinc-200 outline-1 outline-zinc-200 transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 dark:shadow-none dark:-outline-offset-1 dark:outline-zinc-300">
                      <Combobox.Empty className="px-4 py-2 text-[0.925rem] leading-4 text-zinc-600 empty:m-0 empty:p-0">
                        No parent page found
                      </Combobox.Empty>
                      <Combobox.List>
                        {(item: string) => (
                          <Combobox.Item
                            key={item}
                            value={item}
                            className="grid cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-8 pl-4 text-base leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-zinc-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-2 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-zinc-900"
                          >
                            <Combobox.ItemIndicator className="col-start-1">
                              <CheckIcon className="size-3" />
                            </Combobox.ItemIndicator>
                            <div className="col-start-2">{item}</div>
                          </Combobox.Item>
                        )}
                      </Combobox.List>
                    </Combobox.Popup>
                  </Combobox.Positioner>
                </Combobox.Portal>
              </Combobox.Root>
            )}
            <Input
              id="slug"
              value={pageData.slug}
              onChange={handleSlugChange}
              placeholder="e.g. /about-us"
              className={`${parents.length > 0 ? "-ml-[1px] rounded-none rounded-r-md" : ""}`}
            />
          </div>
          <div className="mt-1 text-xs text-zinc-600">The URL of the page (typically from the title) starts with /</div>
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


