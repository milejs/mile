import { useId, useMemo } from "react";
import { Combobox } from '@base-ui-components/react/combobox';
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import useSWR from "swr";
import { PageData } from "@milejs/types";

const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;
const fetcher = (key: string[]) => fetch(`${API}${key.join("")}`).then(res => res.json());

function buildParentItems(parents: any[]): ParentPageValue[] {
  return parents.map((e) => {
    return {
      id: e.id,
      value: e.slug,
      label: e.title,
    }
  })
}

export function SlugInput({ pageData, handleParentSlugChange, handleOwnSlugChange, hideCurrentPageInParentPicker }: { pageData: LocalPageData; handleParentSlugChange: (v?: ParentPageValue | null) => void; handleOwnSlugChange: (event: any) => void; hideCurrentPageInParentPicker?: boolean }) {
  const { data: all_pages, error: parentsError, isLoading: parentsIsLoading } = useSWR([`/pages`], fetcher);
  const memoParents = useMemo(() => {
    if (all_pages && all_pages.length > 0) {
      let parents = all_pages
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
      if (hideCurrentPageInParentPicker) {
        // exclude the self page
        parents = parents.filter((e: any) => {
          return e.slug !== `${pageData.parent?.value}${pageData.own_slug}`
        })
      }
      return buildParentItems(parents);
    }
    return [];
  }, [all_pages, pageData.parent?.value, pageData.own_slug, hideCurrentPageInParentPicker]);

  // value is pageData.parent but we need to get from memoParents 
  // to get the referentially equal object so that the Combobox list item is highlighted
  const value = memoParents.find(e => e.value === pageData.parent?.value) ?? null;

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-y-1">
        <label htmlFor="slug" className="font-semibold text-sm">Slug</label>
        <div className="">
          <code className="block text-xs leading-4 text-zinc-700"><span className="bg-blue-100">{pageData.parent?.value ? pageData.parent.value === "/" ? "" : pageData.parent.value : ""}</span>{`${pageData.own_slug}`}</code>
        </div>
        <Input
          id="slug"
          value={pageData.own_slug}
          onChange={handleOwnSlugChange}
          placeholder="e.g. /about-us"
        />
        <div className="mt-1 text-xs text-zinc-600">The URL of the page starts with / (typically from the title)</div>
      </div>

      {memoParents.length > 0 && <ParentPicker items={memoParents} value={value} setValue={handleParentSlugChange} />}
    </div>
  )
}

export type ParentPageValue = {
  id: string;
  value: string;
  label: string;
}

export type LocalPageData = Omit<PageData, "slug"> & {
  own_slug: string;
  parent?: ParentPageValue | null;
}

export function ParentPicker({ items, value, setValue }: { items: ParentPageValue[]; value: ParentPageValue | null | undefined; setValue: (v: ParentPageValue | null | undefined) => void; }) {
  const comboboxid = useId();

  return (
    <div className="flex flex-col gap-y-1">
      <h3 className="font-semibold text-sm">Parent page</h3>
      <Combobox.Root items={items} value={value} onValueChange={(v) => setValue(v)}>
        <Combobox.Trigger className="flex pr-3 pl-3.5 h-9 rounded-md border border-zinc-200 items-center justify-between gap-3 text-base text-zinc-900 select-none hover:bg-zinc-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 data-[popup-open]:bg-zinc-100 cursor-default">
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
                {(item: ParentPageValue) => {
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
      </Combobox.Root>
    </div>
  )
}
