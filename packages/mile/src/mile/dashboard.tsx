// import useSWR, { mutate } from "swr";
import { Config, PageMetaData } from "@milejs/types";
import { ReactNode, useEffect, useRef, useState } from "react";
import slugify from '@sindresorhus/slugify';
import { demo_tree_data } from "./demo";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { generateId } from "@/lib/generate-id";
import { Input } from "@/components/ui/input";
import { getAuth } from "./auth";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const data = [
  { id: '0', slug: "/", title: "Home", created_at: new Date(), updated_at: new Date() },
  { id: '1', slug: "/about", title: "About", created_at: new Date(), updated_at: new Date() },
]

export function Dashboard({ config, path, search }: { config: Config; path: string; search: { [key: string]: string | string[] | undefined } }) {
  // const { data, error, isLoading } = useSWR("/api/mile/pages", fetcher);
  // if (!data) return null;
  // if (error || data?.error) return <div className="">Error: loading pages failed.</div>;
  // if (isLoading) return <div>loading...</div>;

  return (
    <PageWrapper config={config} path={path} search={search}>
      <div className="py-5">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 flex gap-2 items-center">
            <h1 className="font-bold text-3xl">Pages</h1>
            <PageSettingsModal />
          </div>
          <div className="">
            <PagesList data={data} />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function PageItem({ data }: { data: any }) {
  const href = `/mile${data.slug === "/" ? "/edit" : `${data.slug}/edit`}`;
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

function PagesList({ data }: { data: any }) {
  if (data.length === 0) {
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

function PageSettingsModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="flex gap-1 items-center bg-gray-100 px-3 py-1 text-sm rounded-md border border-gray-400 hover:border-gray-500">New <PlusIcon size={16} /></DialogTrigger>
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
  return Promise.resolve({});
  // return mutate(
  //   "/api/mile/pages",
  //   async (pages) => {
  //     const resp = await fetch("/api/mile/pages", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(data),
  //     });
  //     if (!resp.ok) {
  //       const error = new Error("An error occurred while creating the page.");
  //       const info = await resp.json();
  //       console.error("Error creating page", info);
  //       // @ts-expect-error
  //       error.info = info;
  //       // @ts-expect-error
  //       error.status = resp.status;
  //       throw error;
  //     }
  //     const result = await resp.json();
  //     return [...pages, result];
  //   },
  //   { revalidate: false },
  // );
}

function NewPageSettings({ close }: any) {
  const [pageData, setPageData] = useState<PageMetaData>({
    id: "_notused_",
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
      content: demo_tree_data, // TODO: make template selectable
      title: pageData.title?.trim(),
      name: pageData.title?.trim(),
      slug: pageData.slug.trim(),
      parent_id: pageData.parent_id?.trim(),
    })
      .then((e) => {
        close();
      })
      .catch((e) => {
        let message = e.info?.message ? `${e.message} ${e.info.message}` : e.message;
        setError(message);
      });
  }
  return (
    <div className="flex px-4 py-8 h-full">
      <div className="w-full flex flex-col justify-center items-center">
        <div className="w-full px-8">
          <label htmlFor="">Title</label>
          <Input
            // defaultValue={defaultValue ?? undefined}
            value={pageData.title}
            onChange={handleTitleChange}
            placeholder="e.g. About us"
          />
        </div>
        <div className="relative mt-4 w-full px-8">
          <div className="relative">
            <div className="absolute right-0 -top-1.5">
              <button
                type="button"
                onClick={() => {
                  handleAutoSlug();
                }}
                className="text-xs leading-none"
              >
                Auto
              </button>
            </div>
          </div>
          {/* <PageSlugInput pageMetadataRef={dummyRef} localData={pageData} setLocalData={setPageData} /> */}
        </div>
        <div className="mt-4 w-full px-8">
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


