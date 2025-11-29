// import useSWR, { mutate } from "swr";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EqualIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { Dialog } from "@base-ui-components/react/dialog";
import { generateId } from "@/lib/generate-id";
import { Input } from "@/components/ui/input";
// import { getAuth } from "./auth";
import useSWR, { mutate } from "swr";
import { Field } from "@base-ui-components/react/field";
import { Form } from "@base-ui-components/react/form";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { filesize } from "./utils";
import { Uploaders } from "@/components/ui/uploader";
import { SlugInput } from "./shared";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PageData } from "@milejs/types";
import { Kbd } from "@/components/ui/kbd";
import Fuse from "fuse.js";
import { tinykeys } from "@/lib/tinykeys";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogContent,
  DialogRoot,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authClient } from "./auth-client";
import { LoginForm, SignUpForm } from "./auth-ui";
import { Toaster } from "sonner";

const SITE_URL = process.env.NEXT_PUBLIC_HOST_URL;
const API = `${SITE_URL}/api/mile`;
const NEXT_PUBLIC_IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL;

const fetcher = (key: string[]) =>
  fetch(`${API}${key.join("")}`).then((res) => res.json());

export function Dashboard({
  path,
  search,
}: {
  path: string;
  search: { [key: string]: string | string[] | undefined };
}) {
  console.log("path", path);
  if (path === "/signup") {
    return (
      <GuestShell path={path}>
        <SignupPage />
      </GuestShell>
    );
  }
  if (path === "/login") {
    return (
      <GuestShell path={path}>
        <LoginPage />
      </GuestShell>
    );
  }
  if (path === "/") {
    return (
      <AppShell path={path}>
        <DashboardMain />
      </AppShell>
    );
  }
  if (path === "/pages") {
    return (
      <AppShell path={path}>
        <Pages search={search} />
      </AppShell>
    );
  }
  if (path === "/search") {
    return (
      <AppShell path={path}>
        <SearchPage search={search} />
      </AppShell>
    );
  }
  if (path === "/gallery") {
    return (
      <AppShell path={path}>
        <MediaGallery />
      </AppShell>
    );
  }
  if (path === "/sitemap") {
    return (
      <AppShell path={path}>
        <SitemapPage />
      </AppShell>
    );
  }

  return <div className="">Not found</div>;
}

// Save db after multiple uploads completed
function handleUploadsSuccess(upload: any) {
  // save db
  const payload = upload.files.map((e: any) => {
    return {
      id: generateId(),
      type: e.type,
      size: e.size,
      filepath: e.objectInfo.key,
    };
  });
  mutate(`/medias`, async (prev: any) => {
    const resp = await fetch(`${API}/medias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const error = new Error("An error occurred while saving the images.");
      const info = await resp.json();
      console.error("Error saving images", info);
      // @ts-expect-error okk
      error.info = info;
      // @ts-expect-error okk
      error.status = resp.status;
      throw error;
    }
    const result = await resp.json();
    return prev ? [...prev, ...result] : result;
  });
}

function MediaGallery() {
  const [selectedFileId, setSelectedFileId] = useState("");
  const [open, setOpen] = useState(false);
  const { data, error, isValidating } = useMediaFile(selectedFileId);
  const [isPending, setIsPending] = useState(false);

  function handleSelectFile(file_id: string) {
    setSelectedFileId(file_id);
    setOpen(true);
  }

  return (
    <div className="py-5">
      <MainContainer>
        <div className="mb-6 flex gap-2 items-center">
          <h1 className="font-bold text-3xl">Media Gallery</h1>
        </div>
        <div className="space-y-8">
          <div className="py-2 flex items-center justify-between">
            <div className="flex items-center gap-x-4">
              <Uploaders
                onSuccess={handleUploadsSuccess}
                label={"Upload files"}
              />
            </div>
          </div>
          <div className="/grid /sm:grid-cols-[1fr_300px] /gap-2 /grow /overflow-hidden">
            <div className="overflow-y-auto">
              <MediaFiles
                selectedFileId={selectedFileId}
                handleSelectFile={handleSelectFile}
              />
            </div>
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerPortal>
                <DrawerContent className="mx-auto max-h-[85svh] px-6 pb-8">
                  <DrawerTitle>Media details</DrawerTitle>
                  <MediaMetadata
                    selectedFileId={selectedFileId}
                    setIsPending={setIsPending}
                  />
                </DrawerContent>
              </DrawerPortal>
            </Drawer>
          </div>
        </div>
      </MainContainer>
    </div>
  );
}

function fetchStringKey(key: string) {
  return fetch(`${API}${key}`).then((r) => r.json());
}

function useMediaFiles() {
  return useSWR(`/medias`, fetchStringKey);
}

function MediaFiles({
  selectedFileId,
  handleSelectFile,
}: {
  selectedFileId: string;
  handleSelectFile: (fileId: string) => void;
}) {
  const { data, error, isLoading } = useMediaFiles();
  if (error || data?.error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;
  // console.log("data", data);
  return (
    <div className="">
      <MediaFilesGrid
        data={data}
        selectedFileId={selectedFileId}
        handleSelectFile={handleSelectFile}
      />
    </div>
  );
}

function MediaFilesGrid({
  data,
  selectedFileId,
  handleSelectFile,
}: {
  data: any[];
  selectedFileId: string;
  handleSelectFile: (fileId: string) => void;
}) {
  if (!data || data.length === 0) {
    return <div className="">No files</div>;
  }
  return (
    <div className="grid grid-cols-4 gap-4 items-start">
      {data.map((e: any, i) => (
        <MediaFileCard
          data={e}
          key={`${e.filepath}_${i}`}
          selectedFileId={selectedFileId}
          handleSelectFile={handleSelectFile}
        />
      ))}
    </div>
  );
}

function getImageUrl(key: string) {
  return `${NEXT_PUBLIC_IMAGE_URL}/${key}`;
}

function getFileName(filepath: string) {
  return filepath.split("/").at(-1) ?? "Unknown name";
}

function MediaFileCard({
  data,
  selectedFileId,
  handleSelectFile,
}: {
  data: any;
  selectedFileId: string;
  handleSelectFile: (fileId: string) => void;
}) {
  return (
    <button
      className={`bg-white flex w-full flex-col border ${selectedFileId === data.id ? "border-zinc-500" : "border-zinc-300"} hover:border-zinc-400`}
      onClick={() => {
        handleSelectFile(data.id);
      }}
    >
      <div
        className={`py-5 ${selectedFileId === data.id ? "bg-blue-100" : "bg-zinc-100"} h-[180px] flex justify-center`}
      >
        <img
          src={getImageUrl(data.filepath)}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="px-2 py-2">
        <div className="text-sm leading-4 select-text">
          {getFileName(data.filepath)}
        </div>
      </div>
    </button>
  );
}

function useMediaFile(media_id?: string) {
  return useSWR(media_id ? `/medias/${media_id}` : null, fetchStringKey);
}

function MediaMetadata({
  selectedFileId,
  setIsPending,
}: {
  selectedFileId: string;
  setIsPending: (v: boolean) => void;
}) {
  const { data, error, isLoading, isValidating } = useMediaFile(selectedFileId);
  if (error || data?.error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  if (!data) return null;
  if (data.type == null) {
    return (
      <div className="">
        <div className="mb-4 text-xs">
          <h3 className="mb-1 font-medium">Unknown media file type.</h3>
        </div>
      </div>
    );
  }
  if (data.type.startsWith("image/")) {
    return (
      <ImageDetails
        selectedFileId={selectedFileId}
        data={data}
        setIsPending={setIsPending}
      />
    );
  }

  return null;
}

function ImageDetails({
  selectedFileId,
  data,
  setIsPending,
}: {
  selectedFileId: string;
  data: any;
  setIsPending: (v: boolean) => void;
}) {
  return (
    <div className="mt-5">
      <div className="mb-4 grid grid-cols-[112px_1fr] gap-x-3">
        <div className="mb-2">
          <img src={getImageUrl(data.filepath)} alt="" />
        </div>
        <div className="mb-4 text-xs">
          <h3 className="mb-1.5 font-medium">{data.filepath}</h3>
          <div className="mb-0.5">{filesize(data.size)}</div>
          <div className="text-gray-500">
            {new Date(data.created_at).toString()}
          </div>
          <div className="mt-4">
            <ImageURL defaultValue={getImageUrl(data.filepath)} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-y-3">
        <div className="">
          <TextAreaImageAltText
            key={`alt_${selectedFileId}`}
            fileId={data.id}
            defaultValue={data.alt}
            setIsPending={setIsPending}
          />
        </div>
        <div className="">
          <InputImageTitle
            key={`title_${selectedFileId}`}
            fileId={data.id}
            defaultValue={data.title ?? getFileName(data.filepath)}
            setIsPending={setIsPending}
          />
        </div>
        <div className="">
          <TextAreaImageCaption
            key={`caption_${selectedFileId}`}
            fileId={data.id}
            defaultValue={data.caption}
            setIsPending={setIsPending}
          />
        </div>
      </div>
    </div>
  );
}

function ImageURL({ defaultValue }: any) {
  return (
    <div className="flex flex-col">
      <label htmlFor="" className="mb-1 text-xs font-semibold">
        File url
      </label>
      <Input readOnly defaultValue={defaultValue} className="truncate" />
    </div>
  );
}

function TextAreaImageCaption({
  fileId,
  defaultValue,
  setIsPending,
}: {
  fileId: string;
  defaultValue: string | null;
  setIsPending: (v: boolean) => void;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [value, setValue] = useState("");
  function handleBlur() {
    if (isDirty) {
      updateFileMetadata(fileId, { caption: value }, () => setIsPending(false));
      setIsDirty(false);
    }
  }
  function handleChange(v: string) {
    setValue(v);
    if (!isDirty) {
      setIsDirty(true);
    }
  }

  return (
    <div className="flex flex-col">
      <label htmlFor="" className="mb-1 text-xs font-semibold">
        Caption
      </label>
      <Field.Control
        defaultValue={defaultValue ?? undefined}
        onBlur={handleBlur}
        onValueChange={handleChange}
        render={<Textarea rows={2} />}
      />
    </div>
  );
}

function InputImageTitle({
  fileId,
  defaultValue,
  setIsPending,
}: {
  fileId: string;
  defaultValue: string | null;
  setIsPending: (v: boolean) => void;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [value, setValue] = useState("");
  function handleBlur() {
    if (isDirty) {
      updateFileMetadata(fileId, { title: value }, () => setIsPending(false));
      setIsDirty(false);
    }
  }
  function handleChange(e: any) {
    setValue(e.target.value);
    if (!isDirty) {
      setIsDirty(true);
    }
  }

  return (
    <div className="flex flex-col">
      <label htmlFor="" className="mb-1 text-xs font-semibold">
        Title
      </label>
      <Input
        defaultValue={defaultValue ?? undefined}
        onBlur={handleBlur}
        onChange={handleChange}
        className="truncate"
      />
    </div>
  );
}

function TextAreaImageAltText({
  fileId,
  defaultValue,
  setIsPending,
}: {
  fileId: string;
  defaultValue: string | null;
  setIsPending: (v: boolean) => void;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  function handleBlur() {
    if (isDirty) {
      setIsPending(true);
      updateFileMetadata(fileId, { alt: value }, () => setIsPending(false));
      setIsDirty(false);
    }
  }
  function handleChange(v: string) {
    setValue(v);
    if (!isDirty) {
      setIsDirty(true);
    }
  }
  return (
    <div className="flex flex-col">
      <label htmlFor="" className="mb-1 text-xs font-semibold">
        Alt text
      </label>
      <Field.Control
        value={value}
        onBlur={handleBlur}
        onValueChange={handleChange}
        render={<Textarea rows={4} />}
      />
      {/* <Button onClick={() => { }} className="text-xs">
        Fill it
      </Button> */}
    </div>
  );
}

function updateFileMetadata(
  file_id: string,
  data: { [k: string]: string },
  done: () => void,
) {
  updateMediaMetadata(`${API}/medias/${file_id}`, data)
    .then((e) => {
      mutate(
        (k: string) =>
          typeof k === "string" &&
          (k === `/medias/${file_id}` || k === "/medias"),
      );
      done();
    })
    .catch((e) => {
      console.error("error", e);
      done();
    });
}

async function updateMediaMetadata(url: string, data: { [k: string]: string }) {
  return await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());
}

function DashboardMain() {
  return (
    <div className="py-5">
      <MainContainer>
        <div className="mb-6 flex gap-2 items-center">
          <h1 className="font-bold text-3xl">Welcome</h1>
        </div>
        <div className="space-y-8">
          <div className="">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsam ab
            maiores tempore earum a voluptas debitis voluptatem. Nam suscipit
            officia animi cumque dolorem. Blanditiis amet autem similique porro
            laborum laudantium!
          </div>
        </div>
      </MainContainer>
    </div>
  );
}

function SearchPage({
  search,
}: {
  search: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div className="py-5">
      <MainContainer>
        <div className="mb-6 flex gap-2 items-center">
          <h1 className="font-bold text-3xl">Search result</h1>
        </div>
        <div className="space-y-8">
          <SearchForm initialQuery={search.query} />
          <SearchFetcher search={search} />
        </div>
      </MainContainer>
    </div>
  );
}

function SearchFetcher({
  search,
}: {
  search: { [key: string]: string | string[] | undefined };
}) {
  const { query, page = "1", limit = "30" } = search ?? {};
  const page_no = parseInt(Array.isArray(page) ? page[0] : page, 10);
  const limit_no = parseInt(Array.isArray(limit) ? limit[0] : limit, 10);
  const fetcher_key = [
    `/search?`,
    `q=${query}`,
    `&`,
    `page=${page_no}`,
    `&`,
    `limit=${limit_no}`,
  ];
  return (
    <div>
      <PagesData fetcher_key={fetcher_key} />
      <PagesPagination fetcher_key={fetcher_key} />
    </div>
  );
}

function Pages({
  search,
}: {
  search: { [key: string]: string | string[] | undefined };
}) {
  // const [mode, setMode] = useState("allpages");
  const [mode, setMode] = useState(search.mode || "allpages");

  return (
    <div className="py-5 space-y-6">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-x-2 items-center">
            <h1 className="font-bold text-3xl">Pages</h1>
            <CreatePageModal />
          </div>
          <div className="px-2 bg-zinc-200/50 rounded flex gap-x-2 items-center">
            <button
              className={`py-2 px-2 text-xs ${mode === "allpages" ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-700"} font-medium`}
              onClick={() => {
                setMode("allpages");
                history.pushState(null, "", "/mile/pages?mode=allpages");
              }}
            >
              All pages
            </button>
            <button
              className={`py-2 px-2 text-xs ${mode === "tree" ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-700"} font-medium`}
              onClick={() => {
                setMode("tree");
                history.pushState(null, "", "/mile/pages?mode=tree");
              }}
            >
              Tree view
            </button>
            <button
              className={`py-2 px-2 text-xs ${mode === "pagination" ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-700"} font-medium`}
              onClick={() => {
                setMode("pagination");
                history.pushState(null, "", "/mile/pages?mode=pagination");
              }}
            >
              Pagination
            </button>
          </div>
        </div>
      </div>

      {mode === "allpages" && <AllPages />}
      {mode === "tree" && <TreeViewAllPages />}
      {mode === "pagination" && <PaginatedPages search={search} />}
    </div>
  );
}

function PaginatedPages({
  search,
}: {
  search: { [key: string]: string | string[] | undefined };
}) {
  return (
    <MainContainer>
      <div className="mb-6 flex justify-between items-center">
        <SearchForm />
      </div>

      <div className="">
        <div className="space-y-8">
          <PagesFetcher search={search} />
        </div>
      </div>
    </MainContainer>
  );
}

function TreeViewAllPages() {
  const {
    data: pages,
    error: pagesError,
    isLoading: pagesIsLoading,
  } = useSWR([`/pages/all-pages`], fetcher);
  if (pagesError) return <MainContainer>Failed to load</MainContainer>;
  if (pagesIsLoading) return <MainContainer>loading...</MainContainer>;
  if (pages && pages.error === true) {
    console.error("error", pages.message);
    return <MainContainer>Failed to load</MainContainer>;
  }

  const { data } = pages;

  return (
    <MainContainer>
      <div className="mb-6 flex justify-between items-center">
        <FuzzySearchButton data={data} />
      </div>

      <div className="">
        <div className="space-y-8">
          <AllPagesTreeView data={data} />
        </div>
      </div>
    </MainContainer>
  );
}
function buildTree(
  items: any,
  { parent_id_key = "parent_id" }: { parent_id_key?: string },
) {
  const lookup: Record<string, any> = {};
  const roots = [];

  // Initialize lookup map
  for (const item of items) {
    lookup[item.id] = { ...item, children: [] };
  }

  // Build tree
  for (const item of items) {
    const node = lookup[item.id];
    if (item[parent_id_key]) {
      // Add to parent's children
      if (lookup[item[parent_id_key]]) {
        lookup[item[parent_id_key]].children.push(node);
      }
    } else {
      // No parent_id → root node
      roots.push(node);
    }
  }

  return roots;
}

function hrefEditorPage(id: string) {
  return `/mile/${id}/__edit__`;
}

function Item({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children.length > 0;
  const href = hrefEditorPage(item.id);

  return (
    <div className="">
      <div className="flex items-start gap-x-2">
        {hasChildren ? (
          <div className="pt-2 shrink-0">
            <button
              onClick={() => setOpen(!open)}
              className="px-1 py-1 bg-zinc-100 hover:bg-zinc-200"
            >
              {open ? (
                <ChevronDownIcon size={12} />
              ) : (
                <ChevronRightIcon size={12} />
              )}
            </button>
          </div>
        ) : null}
        <div className="pt-2 pb-2 flex-1 border-b border-zinc-200">
          <a href={href}>
            <div className="text-zinc-700 text-sm font-semibold">
              {item.title || "Untitled"}
            </div>
          </a>
          <div className="-mt-0.5 text-zinc-500 text-xs">
            <div className="flex items-center gap-x-1 text-xs text-zinc-500">
              <PageStatus data={item} />
              <code className="">{item.draft_full_slug}</code>
            </div>
            {item.slug_changed && (
              <div className="">(published: {item.full_slug})</div>
            )}
          </div>
        </div>
      </div>
      {hasChildren && open && (
        <div className="ml-10">
          {item.children.map((child: any) => (
            <Item key={child.id} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function AllPagesTreeView({ data }: { data: any }) {
  const tree = buildTree(data, { parent_id_key: "parent_id" });

  return (
    <div className="">
      {tree.map((item: any) => (
        <Item key={item.id} item={item} />
      ))}
    </div>
  );
}

function MainContainer({ children }: { children: React.ReactNode }) {
  return <div className="max-w-5xl mx-auto">{children}</div>;
}

function AllPages() {
  const {
    data: pages,
    error: pagesError,
    isLoading: pagesIsLoading,
  } = useSWR([`/pages/all-pages`], fetcher);
  if (pagesError) return <MainContainer>Failed to load</MainContainer>;
  if (pagesIsLoading) return <MainContainer>loading...</MainContainer>;
  if (pages && pages.error === true) {
    console.error("error", pages.message);
    return <MainContainer>Failed to load</MainContainer>;
  }

  const { data } = pages;

  return (
    <MainContainer>
      <div className="mb-6 flex justify-between items-center">
        <FuzzySearchButton data={data} />
      </div>

      <div className="">
        <div className="space-y-2">
          <TableHeader />
          <AllPagesList data={data} />
        </div>
      </div>
    </MainContainer>
  );
}

function TableHeader() {
  return (
    <TableRow>
      <TableCol1>
        <span className="text-xs text-zinc-600 font-semibold">Page Name</span>
      </TableCol1>
      <TableCol2>
        <span className="text-xs text-zinc-600 font-semibold">Last edited</span>
      </TableCol2>
      <TableCol3>
        <span className="text-xs text-zinc-600 font-semibold">Created</span>
      </TableCol3>
    </TableRow>
  );
}

function AllPagesList({ data }: { data: any }) {
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  if (!data || data.length === 0) {
    return <div className="">No pages</div>;
  }

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page_no: number) => {
    if (page_no >= 1 && page_no <= totalPages) {
      setCurrentPage(page_no);
    }
  };

  return (
    <div className="space-y-10">
      <div className="divide-y divide-zinc-200">
        {currentItems.map((e: any) => {
          return <PageItem key={e.id} data={e} />;
        })}
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handlePageChange(currentPage - 1);
              }}
            />
          </PaginationItem>

          {Array.from({ length: totalPages }).map((_, i) => {
            const page = i + 1;
            return (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={page === currentPage}
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(page);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {totalPages > 5 && <PaginationEllipsis />}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handlePageChange(currentPage + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function FuzzySearchButton({ data }: { data: any }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      "$mod+K": (e: Event) => {
        e.preventDefault();
        setOpen(true);
      },
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div>
      <Button
        onClick={() => setOpen(true)}
        className="bg-zinc-200/70 hover:bg-zinc-200 text-zinc-700 relative w-full justify-start overflow-hidden border-0 pr-12 text-sm font-normal shadow-none md:w-40 lg:w-64"
      >
        <span className="hidden max-w-[calc(100%-32px)] overflow-hidden lg:inline-flex">
          Search page...
        </span>
        <span className="inline-flex lg:hidden">Search...</span>
        <div className="pointer-events-none absolute right-3 flex gap-x-0.5">
          <Kbd className="border-0 text-[10px]">⌘</Kbd>
          <Kbd className="border-0 text-[10px]">K</Kbd>
        </div>
      </Button>
      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogContent className="fixed /top-1/2 top-[100px] left-1/2 w-4xl max-w-[calc(100vw-3rem)] -translate-x-1/2 /-translate-y-1/2 rounded-lg bg-zinc-50 p-6 text-zinc-900 outline-1 outline-zinc-200 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
          <FuzzySearchResult data={data} />
        </DialogContent>
      </DialogRoot>
    </div>
  );
}

const fuse_options = {
  includeScore: true,
  keys: ["title", "slug", "draft_full_slug"],
};

function FuzzySearchResult({ data }: { data: any }) {
  const [search, setSearch] = useState("");
  const fuse = useMemo(() => {
    return new Fuse(data, fuse_options);
  }, [data]);
  const items =
    search !== "" && fuse != null
      ? fuse.search(search.toLowerCase()).map((e) => {
          return e.item;
        })
      : null;

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  return (
    <div>
      <div className="mb-3">
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search page..."
        />
      </div>
      <div className="h-[400px] overflow-auto">
        {items?.map((item: any) => {
          const href = hrefEditorPage(item.id);

          return (
            <a href={href} key={item.id}>
              <div key={item.id} className="px-3 pt-1 py-1.5 hover:bg-zinc-100">
                <div className="font-semibold text-sm">{item.title}</div>
                <div className="text-xs text-gray-500">
                  {item.draft_full_slug}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function Pages_bk_pagination({
  search,
}: {
  search: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div className="py-5">
      <MainContainer>
        <div className="mb-6 flex gap-2 items-center">
          <h1 className="font-bold text-3xl">Pages</h1>
          <CreatePageModal />
        </div>
        <div className="space-y-8">
          <SearchForm />
          <PagesFetcher search={search} />
        </div>
      </MainContainer>
    </div>
  );
}

function SearchForm({ initialQuery }: { initialQuery?: any }) {
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(initialQuery ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Form
      className="flex flex-row items-center gap-x-2"
      errors={errors}
      onClearErrors={setErrors}
      action="/mile/search"
    >
      <Field.Root name="query" className="flex flex-col items-start gap-y-1">
        <div className="relative">
          <div className="absolute top-3 left-2">
            <SearchIcon size={16} />
          </div>
          <Field.Control
            ref={inputRef}
            type="text"
            value={value}
            onValueChange={setValue}
            placeholder="Search by page title"
            className="h-10 w-full sm:min-w-[400px] rounded-md border border-gray-300 pl-8 text-base text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
          />
          <div className="absolute top-2 right-2">
            <button
              type="button"
              onClick={() => {
                setValue("");
                inputRef.current?.focus();
              }}
              className="rounded px-2 py-1 hover:bg-zinc-100 cursor-pointer"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
        <Field.Error className="text-sm text-red-800" />
      </Field.Root>
      <button
        disabled={loading}
        type="submit"
        className="flex h-10 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3.5 text-base font-medium text-gray-900 select-none hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      >
        Search
      </button>
    </Form>
  );
}

function PagesFetcher({
  search,
}: {
  search: { [key: string]: string | string[] | undefined };
}) {
  const { page = "1", limit = "4" } = search ?? {};
  const page_no = parseInt(Array.isArray(page) ? page[0] : page, 10);
  const limit_no = parseInt(Array.isArray(limit) ? limit[0] : limit, 10);
  const fetcher_key = [`/pages?`, `page=${page_no}`, `&`, `limit=${limit_no}`];

  return (
    <div>
      <PagesData fetcher_key={fetcher_key} />
      <PagesPagination fetcher_key={fetcher_key} />
    </div>
  );
}

function PagesPagination({ fetcher_key }: { fetcher_key: string[] }) {
  const {
    data: pages,
    error: pagesError,
    isLoading: pagesIsLoading,
  } = useSWR(fetcher_key, fetcher);
  if (pagesError) return <div>Failed to load</div>;
  if (pagesIsLoading) return null;
  if (pages && pages.error === true) {
    console.error("error", pages.message);
    return <div className="">Failed to load</div>;
  }

  const { pagination } = pages;
  const { current_page, total_pages, has_next, has_prev } = pagination;

  // Generate page numbers to display based on total pages
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7; // Max page buttons to show (excluding prev/next)

    // Case 1: Total pages <= maxVisible, show all pages
    if (total_pages <= maxVisible) {
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Case 2: Many pages, show smart pagination with ellipsis
    // Always show: first page, last page, current page, and pages around current

    // Always include first page
    pages.push(1);

    // Calculate range around current page
    const leftSiblings = Math.max(2, current_page - 1);
    const rightSiblings = Math.min(total_pages - 1, current_page + 1);

    // Show left ellipsis if there's a gap
    if (leftSiblings > 2) {
      pages.push("ellipsis-left");
    }

    // Show pages around current page
    for (let i = leftSiblings; i <= rightSiblings; i++) {
      if (i !== 1 && i !== total_pages) {
        pages.push(i);
      }
    }

    // Show right ellipsis if there's a gap
    if (rightSiblings < total_pages - 1) {
      pages.push("ellipsis-right");
    }

    // Always include last page
    if (total_pages > 1) {
      pages.push(total_pages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  // const prevLink = !has_prev
  //   ? ""
  //   : `/mile/pages?${current_page > 1 ? `page=${current_page - 1}` : ""}`;
  // const nextLink = !has_next ? "" : `/mile/pages?page=${current_page + 1}`;
  const params = new URLSearchParams(window.location.search);
  const newParams = new URLSearchParams(params);

  // Calculate page links
  const prevLink = !has_prev
    ? ""
    : (() => {
        const pageNum = Math.max(1, current_page - 1);
        newParams.set("page", `${pageNum}`);
        return `/mile/pages?${newParams.toString()}`;
      })();

  const nextLink = !has_next
    ? ""
    : (() => {
        newParams.set("page", current_page + 1);
        return `/mile/pages?${newParams.toString()}`;
      })();

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous Button */}
        <PaginationItem>
          <PaginationPrevious
            href={prevLink}
            className={`${!has_prev ? "opacity-50" : ""}`}
          />
        </PaginationItem>

        {/* Page Numbers */}
        {pageNumbers.map((page, idx) => {
          newParams.set("page", page);
          return (
            <PaginationItem key={`${page}-${idx}`}>
              {typeof page === "number" ? (
                <PaginationLink
                  href={`/mile/pages?${newParams.toString()}`}
                  isActive={page === current_page}
                >
                  {page}
                </PaginationLink>
              ) : (
                <PaginationEllipsis />
              )}
            </PaginationItem>
          );
        })}

        {/* Next Button */}
        <PaginationItem>
          <PaginationNext
            href={nextLink}
            className={`${!has_next ? "opacity-50" : ""}`}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function PagesData({ fetcher_key }: { fetcher_key: string[] }) {
  const {
    data: pages,
    error: pagesError,
    isLoading: pagesIsLoading,
  } = useSWR(fetcher_key, fetcher);
  // console.log('pages', pages, pagesError, pagesIsLoading);
  if (pagesError) return <div>Failed to load</div>;
  if (pagesIsLoading) return <div>loading...</div>;
  if (pages && pages.error === true) {
    console.error("error", pages.message);
    return <div className="">Failed to load</div>;
  }

  return <PagesList data={pages.data} />;
}

function PagesList({ data }: { data: any }) {
  if (!data || data.length === 0) {
    return <div className="">No pages</div>;
  }

  return (
    <div className="divide-y divide-zinc-200">
      {data.map((e: any) => {
        return <PageItem key={e.id} data={e} />;
      })}
    </div>
  );
}

function TableRow({ children }: { children: React.ReactNode }) {
  return <div className="py-1.5 flex flex-row">{children}</div>;
}

function TableCol1({ children }: { children: React.ReactNode }) {
  return <div className="truncate grow-1 w-full pr-4">{children}</div>;
}
function TableCol2({ children }: { children: React.ReactNode }) {
  return <div className="w-32 shrink-0">{children}</div>;
}
function TableCol3({ children }: { children: React.ReactNode }) {
  return <div className="w-32 shrink-0">{children}</div>;
}

function PageItem({ data }: { data: any }) {
  const href = hrefEditorPage(data.id);

  return (
    <TableRow>
      <TableCol1>
        <div className="">
          <a href={href}>
            <div className="font-semibold text-sm">
              {data.title || "Untitled"}
            </div>
            <div className="flex items-center gap-x-1 text-xs text-zinc-500">
              <PageStatus data={data} />
              <code className="">{data.draft_full_slug}</code>
            </div>
          </a>
        </div>
      </TableCol1>
      <TableCol2>
        <div className="text-xs text-zinc-700">
          {new Date(data.last_edited).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      </TableCol2>
      <TableCol3>
        <div className="text-xs text-zinc-700">
          {new Date(data.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      </TableCol3>
    </TableRow>
  );
}

function PageStatus({ data }: { data: any }) {
  if (!data.status) return null;
  const status = data.status;

  let classes = "";
  switch (status) {
    case "draft":
      classes = "bg-yellow-200 text-yellow-600";
      break;
    case "unpublished":
      classes = "bg-yellow-200 text-yellow-600";
      break;
    case "published":
      classes = "bg-green-200 text-green-600";
      break;
    case "archived":
      classes = "bg-gray-200 text-gray-600";
      break;
    default:
      classes = "bg-red-200 text-red-600";
      break;
  }
  return (
    <div
      className={`px-1 py-0.5 rounded-xs text-[9px] uppercase font-semibold ${classes}`}
    >
      {status} {data.slug_changed && "*"}
    </div>
  );
}

function CreatePageModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DialogRoot open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="h-9 flex items-center justify-center gap-x-1 rounded-md border border-zinc-300 bg-zinc-50 px-3.5 text-sm font-medium text-zinc-900 select-none hover:bg-zinc-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-zinc-100">
        New <PlusIcon size={16} />
      </DialogTrigger>
      <DialogContent className="fixed top-1/2 left-1/2 w-lg max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-zinc-50 p-6 text-zinc-900 outline-1 outline-zinc-200 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
        <Dialog.Title className="-mt-1.5 mb-1 text-lg font-medium">
          Create New Page
        </Dialog.Title>
        <NewPageSettings
          close={() => {
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </DialogRoot>
  );
}

async function createPage(data: { [k: string]: any }) {
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
  // console.log("POST CREATE", pages, result);

  return result?.data;
}

function NewPageSettings({ close }: any) {
  const [pageData, setPageData] = useState<PageData>({
    id: "_notused_",
    title: "",
    type: "page",
    slug: "",
    content: "",
    description: "",
    parent_id: null,
    og_image_ids: [],
    og_images: [],
  });
  const [error, setError] = useState<string | null>(null);
  const parent = useSWR(
    pageData.parent_id ? [`/pages/`, pageData.parent_id] : null,
    fetcher,
  );

  function handleTitleChange(event: any) {
    setPageData((e) => {
      return { ...e, title: event.target.value };
    });
  }

  function handleTypeChange(event: any) {
    setPageData((e) => {
      return { ...e, type: event.target.value };
    });
  }

  function handleSlugChange(v: string) {
    setPageData((e) => {
      return { ...e, slug: v };
    });
  }

  function handleParentIdChange(parent_id: string | null) {
    setPageData((e) => {
      return { ...e, parent_id };
    });
  }

  function handleMetaDescriptionChange(v: string) {
    setPageData((e) => {
      return { ...e, description: v };
    });
  }

  async function handleCreatePage() {
    // validate
    if (pageData.title === "") {
      setError("Title is required.");
      return;
    }
    // if (pageData.own_slug === "") {
    //   setError("Slug is required.");
    //   return;
    // }
    if (pageData.slug !== "" && pageData.slug.at(0) === "/") {
      setError("Slug cannot start with slash e.g. /good-slug ");
      return;
    }
    if (pageData.slug !== "" && pageData.slug.slice(-1) === "/") {
      setError("Slug cannot end with slash e.g. bad-slug/");
      return;
    }
    setError(null);

    const payload = {
      id: generateId(),
      title: pageData.title?.trim(),
      type: pageData.type?.trim(),
      slug: pageData.slug,
      parent_id: pageData.parent_id,
      content: pageData.content,
      description: pageData.description,
      // description
      // keywords
      // llm
      // no_index
      // no_follow
    };
    // console.log("payload", pageData, payload);
    await createPage(payload)
      .then((e) => {
        console.log("createPage e", e);
        if (e) {
          window.location.assign(hrefEditorPage(e));
        }
        // close();
      })
      .catch((e) => {
        let message = e.info?.message
          ? `${e.message} ${e.info.message}`
          : e.message;
        setError(message);
      });
  }

  return (
    <>
      <div className="overflow-y-auto h-[calc(100vh-350px)]">
        <div className="pt-2 pb-12 space-y-4">
          <div className="w-full">
            <label htmlFor="title" className="font-semibold text-sm">
              Title
            </label>
            <Input
              id="title"
              value={pageData.title}
              onChange={handleTitleChange}
              placeholder="e.g. About us"
            />
            <div className="mt-1 text-xs text-zinc-600">
              Title of the page displayed on the browser
            </div>
          </div>
          <div className="w-full">
            <label htmlFor="type" className="font-semibold text-sm">
              Type
            </label>
            <Input
              id="type"
              value={pageData.type}
              onChange={handleTypeChange}
              placeholder="e.g. page or post"
            />
            <div className="mt-1 text-xs text-zinc-600">"page" or "post"</div>
          </div>
          <div className="w-full relative">
            <SlugInput
              value={pageData.slug}
              onChange={handleSlugChange}
              title={pageData.title}
              parentId={pageData.parent_id}
              parentTitle={parent?.data?.title}
              onParentChange={handleParentIdChange}
            />
          </div>
          <div className="w-full">
            <label htmlFor="metadescription" className="font-semibold text-sm">
              Meta Description
            </label>
            <Field.Control
              id="metadescription"
              value={pageData.description}
              onValueChange={handleMetaDescriptionChange}
              render={<Textarea rows={4} />}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 w-full">
        {error ? (
          <div className="mb-2 text-xs text-red-600">{error}</div>
        ) : null}
        <Button
          onClick={handleCreatePage}
          className="w-full py-3 text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
        >
          Create page
        </Button>
      </div>
    </>
  );
}

function SitemapPage() {
  // const [mode, setMode] = useState("allpages");
  const {
    data: pages,
    error: pagesError,
    isLoading: pagesIsLoading,
  } = useSWR([`/pages/all-pages-sitemap`], fetcher);
  if (pagesError) return <MainContainer>Failed to load</MainContainer>;
  if (pagesIsLoading) return <MainContainer>loading...</MainContainer>;
  if (pages && pages.error === true) {
    console.error("error", pages.message);
    return <MainContainer>Failed to load</MainContainer>;
  }

  const { data } = pages;

  return (
    <div className="py-5 space-y-6">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-x-2 items-center">
            <h1 className="font-bold text-3xl">Sitemap</h1>
          </div>
        </div>
      </div>

      <MainContainer>
        <div className="">
          <div className="space-y-2">
            <TableRow>
              <TableCol1>
                <span className="text-xs text-zinc-600 font-semibold">
                  Item
                </span>
              </TableCol1>
              <TableCol2>
                <span className="text-xs text-zinc-600 font-semibold">
                  Last modified
                </span>
              </TableCol2>
            </TableRow>
            <div className="space-y-10">
              <div className="divide-y divide-zinc-200">
                {data.map((e: any) => {
                  return <SitemapItem key={e.pages.id} data={e} />;
                })}
              </div>
            </div>
          </div>
        </div>
      </MainContainer>
    </div>
  );
}

function SitemapItem({ data }: { data: any }) {
  const href = hrefEditorPage(data.pages.id);

  return (
    <TableRow>
      <TableCol1>
        <div className="">
          <a href={href}>
            <div className="font-semibold text-sm">
              {data.drafts.title || "Untitled"}
            </div>
            <div className="flex items-center gap-x-1 text-xs text-zinc-500">
              <code className="">
                {SITE_URL}
                {data.pages.full_slug}
              </code>
            </div>
          </a>
        </div>
      </TableCol1>
      <TableCol2>
        <div className="text-xs text-zinc-700">
          {new Date(data.drafts.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      </TableCol2>
    </TableRow>
  );
}

/**
 * AuthWrapper renders nothing unless user has a valid auth
 * @returns
 */
// function PageWrapper(props: {
//   config: Config;
//   children: ReactNode;
//   path: string;
//   search: { [key: string]: string | string[] | undefined };
// }) {
//   console.log("path=====", props.path, props.search);
//   if (props.path === "/setup") {
//     return <MileGithubSetup config={props.config} />;
//   }
//   if (props.path === "/created-github-app") {
//     return <CreatedGitHubApp config={props.config} search={props.search} />;
//   }
//   return <AuthWrapper config={props.config}>{props.children}</AuthWrapper>;
// }

// function CreatedGitHubApp({
//   config,
//   search,
// }: {
//   config: Config;
//   search: { [key: string]: string | string[] | undefined };
// }) {
//   return (
//     <div className="py-24 max-w-2xl mx-auto">
//       <h1 className="text-2xl font-bold">You've installed Mile! 🎉</h1>
//       <div className="mt-4">
//         To start using Mile, you need to install the GitHub app you've created.
//       </div>

//       <div className="mt-3 space-y-2">
//         <div className="">
//           Make sure to add the App to the <code>{config.storage.repo}</code>{" "}
//           repository.
//         </div>
//         <InstallGitHubApp config={config} search={search} />
//       </div>
//     </div>
//   );
// }

// function InstallGitHubApp({
//   config,
//   search,
// }: {
//   config: Config;
//   search: { [key: string]: string | string[] | undefined };
// }) {
//   return (
//     <div className="">
//       <a
//         href={`https://github.com/apps/${search.slug}/installations/new`}
//         className={`${buttonVariants()}`}
//       >
//         Install GitHub App
//       </a>
//     </div>
//   );
// }

// function MileGithubSetup({ config }: { config: Config }) {
//   const [deployedURL, setDeployedURL] = useState("");
//   const [organization, setOrganization] = useState("");

//   return (
//     <div className="py-24 max-w-2xl mx-auto">
//       <h1 className="text-2xl font-bold">Mile GitHub Setup</h1>
//       <div className="">Create GitHub App</div>
//       <form
//         action={`https://github.com${organization ? `/organizations/${organization}` : ""}/settings/apps/new`}
//         method="post"
//         className="mt-8 space-y-4"
//       >
//         <div className="">
//           <label className="block font-medium mb-1" htmlFor="deployedURL">
//             Deployed App URL
//           </label>
//           <Input
//             id="deployedURL"
//             value={deployedURL}
//             onChange={(e) => setDeployedURL(e.target.value)}
//           />
//           <div className="text-xs">
//             This should the root of your domain. If you're not sure where Mile
//             will be deployed, leave this blank and you can update the GitHub app
//             later.
//           </div>
//         </div>

//         <div className="">
//           <label className="block font-medium mb-1" htmlFor="organization">
//             GitHub organization (if any)
//           </label>
//           <Input
//             id="organization"
//             value={organization}
//             onChange={(e) => setOrganization(e.target.value)}
//           />
//           <div className="text-xs">
//             You must be an owner or GitHub App manager in the organization to
//             create the GitHub App. Leave this blank to create the app in your
//             personal account.
//           </div>
//         </div>

//         <input
//           type="text"
//           name="manifest"
//           style={{ display: "none" }}
//           value={JSON.stringify({
//             name: `${parseRepoConfig(config.storage.repo).owner} Mile`,
//             url: deployedURL
//               ? new URL("/mile", deployedURL).toString()
//               : `${window.location.origin}/mile`,
//             public: true,
//             redirect_url: `${window.location.origin}/api/mile/github/created-app`,
//             callback_urls: [
//               `${window.location.origin}/api/mile/github/oauth/callback`,
//               `http://127.0.0.1/api/mile/github/oauth/callback`,
//               ...(deployedURL
//                 ? [
//                     new URL(
//                       "/api/mile/github/oauth/callback",
//                       deployedURL,
//                     ).toString(),
//                   ]
//                 : []),
//             ],
//             request_oauth_on_install: true,
//             default_permissions: {
//               contents: "write",
//               metadata: "read",
//               pull_requests: "read",
//             },
//           })}
//         />
//         <Button type="submit">Create GitHub App</Button>
//       </form>
//     </div>
//   );
// }

// function parseRepoConfig(repo: string) {
//   const [owner, name] = repo.split("/");
//   return { owner, name };
// }

/**
 * AuthWrapper renders nothing unless user has a valid auth
 * @returns
 */
// function AuthWrapper(props: { config: Config; children: ReactNode }) {
//   const [state, setState] = useState<"unknown" | "valid" | "explicit-auth">(
//     "unknown",
//   );
//   useEffect(() => {
//     getAuth(props.config).then((auth) => {
//       if (auth) {
//         setState("valid");
//         return;
//       }
//       setState("explicit-auth");
//     });
//   }, [props.config]);

//   if (state === "valid") {
//     return props.children;
//   }

//   if (state === "explicit-auth") {
//     if (props.config.storage.kind === "github") {
//       return (
//         <div className="flex items-center justify-center h-screen">
//           <a
//             href={`/api/mile/github/login`}
//             target="_top"
//             className="flex flex-row items-center gap-x-1"
//           >
//             <GithubIcon />
//             <div>Log in with GitHub</div>
//           </a>
//         </div>
//       );
//     }
//   }

//   return null;
// }

// const GithubIcon = ({ width, height }: any) => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     width={width ?? "24"}
//     height={height ?? "24"}
//     viewBox="0 0 24 24"
//   >
//     <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4" />
//     <path d="M9 18c-4.51 2-5-2-7-2" />
//   </svg>
// );

function AppShell({ path, children }: { path: string; children: ReactNode }) {
  const {
    data: session,
    isPending: isSessionPending, //loading state
    error, //error object
    refetch, //refetch the session
  } = authClient.useSession();
  if (isSessionPending) return <div>Loading...</div>;
  if (!session) {
    window.location.assign("/mile/login");
    return null;
  }

  return (
    <>
      <div>
        <Header path={path} session={session} />
        <DocsLayout path={path}>{children}</DocsLayout>
        <Footer />
      </div>
      <Toaster />
    </>
  );
}

const DocsLayout = ({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) => (
  <div className="/container mx-auto gap-8 px-4 md:grid md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_1fr] xl:px-0">
    <aside className="fixed top-14 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block xl:border-r">
      <div className="scrollbar-hidden h-full overflow-y-auto py-4 pr-2 pl-6">
        <DocsSidebarNav path={path} />
      </div>
    </aside>
    <main className="min-h-screen">{children}</main>
  </div>
);

interface DocsSidebarNavProps {
  path: string;
  onNavItemClick?: () => void;
}
const DocsSidebarNav = ({ path, onNavItemClick }: DocsSidebarNavProps) => {
  return (
    <>
      {navConfig.sidebarNav.map((group, index) => (
        <div key={index} className="pb-4 [&:last-child]:pb-0">
          <h4 className="text-foreground mb-1 text-sm font-semibold">
            {group.title}
          </h4>
          {group.items.length && (
            <DocsSidebarNavItems
              items={group.items}
              path={path}
              onNavItemClick={onNavItemClick}
            />
          )}
        </div>
      ))}
    </>
  );
};

interface SidebarNavGroup {
  title: string;
  items: NavItem[];
  disabled?: boolean;
}

interface DocsSidebarNavItemsProps {
  items: SidebarNavGroup["items"];
  path: string | null;
  onNavItemClick?: () => void;
}

const DocsSidebarNavItems = ({
  items,
  path,
  onNavItemClick,
}: DocsSidebarNavItemsProps) => {
  const milepath = path === "/" ? "/mile" : `/mile${path}`;
  return (
    <div className="mt-1 space-y-0.5 text-sm">
      {items.map((item, index) => {
        return !item.disabled && item.href ? (
          <a
            key={index}
            href={item.href}
            onClick={onNavItemClick}
            className={cn(
              "hover:text-foreground -ml-2 flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 transition-colors",
              milepath === item.href
                ? "bg-secondary/50 text-foreground pl-2"
                : "text-muted-foreground border-transparent",
            )}
            target={item.external ? "_blank" : ""}
            rel={item.external ? "noreferrer" : ""}
          >
            {item.title}
            {item.label && (
              <span className="bg-info text-info-foreground rounded px-1.5 py-0.5 text-xs font-medium">
                {item.label}
              </span>
            )}
          </a>
        ) : (
          <span
            key={index}
            className={cn(
              "text-muted-foreground -ml-2 flex w-full cursor-not-allowed items-center justify-between gap-2 border border-transparent px-2 py-1.5 opacity-60",
            )}
          >
            {item.title}
            {item.label && (
              <span className="bg-info text-info-foreground rounded px-1.5 py-0.5 text-xs font-medium">
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};

const Footer = () => (
  <footer className="border-t border-dashed">
    <div className="/container mx-auto border-dashed py-4 xl:border-x">
      <div className="text-muted-foreground text-center text-sm">
        Senior Living Health Solutions
      </div>
    </div>
  </footer>
);

function Header({ path, session }: { path: string; session: any }) {
  return (
    <header className="bg-background supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 mx-auto w-full border-b border backdrop-blur">
      <div className="/container mx-auto px-4 xl:px-0 flex h-14 items-center">
        <MainNav path={path} />
        <MobileNav path={path} />
        <div className="flex-1" />
        <div className="sm:mr-4 flex items-center gap-x-3">
          <div className="hidden md:block">{/* <SearchDialog /> */}</div>
          <div className="text-xs text-zinc-700">
            <span className="">{session.user.email}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="text-xs"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    window.location.assign("/mile/login"); // redirect to login page
                  },
                },
              });
            }}
          >
            Log out
          </Button>
          {/* <AuthedUserMenu /> */}
        </div>
      </div>
    </header>
  );
}

function MobileNav({ path }: { path: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-x-1 md:hidden">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button className="[&>svg]:size-6" variant="ghost" size="icon">
            <EqualIcon />
          </Button>
        </DrawerTrigger>
        <DrawerPortal>
          <DrawerTitle>Test</DrawerTitle>
          <DrawerContent className="mx-auto max-h-[85svh] pl-2">
            <div className="overflow-auto p-6 text-sm">
              <div className="space-y-0.5">
                {navConfig.mainNav.map((item) => (
                  <MobileNavItem
                    path={path}
                    key={item.title}
                    item={item}
                    onNavItemClick={() => setOpen(false)}
                  />
                ))}
              </div>
              {navConfig.sidebarNav.map((group) => (
                <div key={group.title} className="mt-4">
                  <h4 className="text-foreground mb-1 text-sm font-semibold">
                    {group.title}
                  </h4>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <MobileNavItem
                        path={path}
                        key={item.title}
                        item={item}
                        onNavItemClick={() => setOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>
      {/*<div className="mx-2 my-auto h-6 w-[1px] bg-zinc-200" />*/}
      <a href="/" className="ml-2 flex items-center">
        {/* <Circle className="size-3" /> */}
        <span className="ml-0.5 font-mono text-lg font-black">Mile</span>
      </a>
    </div>
  );
}

interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
  label?: string;
}

function MobileNavItem({
  path,
  item,
  onNavItemClick,
}: {
  path: string;
  item: NavItem;
  onNavItemClick: () => void;
}) {
  return !item.disabled && item.href ? (
    <a
      href={item.href}
      onClick={onNavItemClick}
      className={cn(
        "hover:text-foreground -ml-2 flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 transition-colors",
        path === item.href
          ? "bg-secondary/50 text-foreground pl-2"
          : "text-muted-foreground border-transparent",
      )}
      target={item.external ? "_blank" : ""}
      rel={item.external ? "noreferrer" : ""}
    >
      {item.title}
      {item.label && (
        <span className="bg-info text-info-foreground rounded px-1.5 py-0.5 text-xs font-medium">
          {item.label}
        </span>
      )}
    </a>
  ) : (
    <span
      className={cn(
        "text-muted-foreground -ml-2 flex w-full cursor-not-allowed items-center justify-between gap-2 border border-transparent px-2 py-1.5 opacity-60",
      )}
    >
      {item.title}
      {item.label && (
        <span className="bg-info text-info-foreground rounded px-1.5 py-0.5 text-xs font-medium">
          {item.label}
        </span>
      )}
    </span>
  );
}

function MainNav({ path }: { path: string }) {
  return (
    <div className="mr-4 hidden md:flex">
      <a href="/mile" className="px-6 flex items-center">
        {/* <Circle className="size-3 mr-2" /> */}
        <span className="font-mono text-lg font-black">Mile</span>
      </a>
      <nav className="flex items-center gap-6 pl-6 text-sm">
        <a
          href="/docs"
          className={cn(
            "hover:text-foreground transition-colors",
            path.startsWith("/docs")
              ? "text-foreground font-medium"
              : "text-muted-foreground",
          )}
        >
          Docs
        </a>
        <a
          href="/components"
          className={cn(
            "hover:text-foreground transition-colors",
            path?.startsWith("/components")
              ? "text-foreground font-medium"
              : "text-muted-foreground",
          )}
        >
          Components
        </a>
        <a
          href="/themes"
          className={cn(
            "hover:text-foreground transition-colors",
            path?.startsWith("/themes")
              ? "text-foreground font-medium"
              : "text-muted-foreground",
          )}
        >
          Themes
        </a>
      </nav>
    </div>
  );
}

const navConfig = {
  mainNav: [
    {
      title: "Docs",
      href: "/docs/getting-started",
    },
    {
      title: "Components",
      href: "/docs/components",
    },
    {
      title: "Themes",
      href: "/themes",
    },
  ],
  sidebarNav: [
    {
      title: "Menu",
      items: [
        {
          title: "Dashboard",
          href: "/mile",
        },
        {
          title: "Pages",
          href: "/mile/pages",
        },
        {
          title: "Search",
          href: "/mile/search",
        },
        {
          title: "Gallery",
          href: "/mile/gallery",
        },
        {
          title: "Sitemap",
          href: "/mile/sitemap",
        },
      ],
    },
    {
      title: "Components",
      items: [
        {
          title: "Accordion",
          href: "/docs/components/accordion",
        },
        {
          title: "Alert Dialog",
          href: "/docs/components/alert-dialog",
        },
        {
          title: "Alert",
          href: "/docs/components/alert",
        },
        {
          title: "Data Table",
          href: "/docs/components/data-table",
          disabled: true,
          label: "Soon",
        },
        {
          title: "Date Picker",
          href: "/docs/components/date-picker",
        },
      ],
    },
  ],
};

function GuestShell({ path, children }: { path: string; children: ReactNode }) {
  const {
    data: session,
    isPending: isSessionPending, //loading state
    error, //error object
    refetch, //refetch the session
  } = authClient.useSession();
  if (isSessionPending) return <div>Loading...</div>;
  if (session) {
    window.location.assign("/mile");
    return null;
  }

  return (
    <>
      <div>
        {/*<Header path={path} />*/}
        <div>{children}</div>
        <Footer />
      </div>
      <Toaster />
    </>
  );
}

function SignupPage() {
  return (
    <div className="pt-14 px-4 sm:px-0">
      <MainContainer>
        <div className="space-y-8">
          <SignUpForm />
        </div>
      </MainContainer>
    </div>
  );
}

function LoginPage() {
  return (
    <div className="pt-14 px-4 sm:px-0">
      <MainContainer>
        <div className="space-y-8">
          <LoginForm />
        </div>
      </MainContainer>
    </div>
  );
}
