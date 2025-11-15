import { useEffect, useMemo, useRef, useState } from "react";
import { FolderOpen, Home, Link2, Loader2, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import debounce from "debounce";
import slugify from "@sindresorhus/slugify";

const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;

const useDebounce = (callback: () => Promise<void>) => {
  const ref = useRef<() => Promise<void> | null>(null);
  useEffect(() => {
    ref.current = callback;
  }, [callback]);
  const debouncedCallback = useMemo(() => {
    const func = () => {
      ref.current?.();
    };
    return debounce(func, 1000);
  }, []);
  return debouncedCallback;
};

export function SlugInput({
  value = "",
  onChange,
  title,
  parentId,
  parentTitle = "",
  onParentChange,
}: {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  parentId: string | null | undefined;
  parentTitle: string | undefined;
  onParentChange: (parentId: string | null) => void;
}) {
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; title: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [parentFullSlug, setParentFullSlug] = useState("");
  const [isLoadingParentPath, setIsLoadingParentPath] = useState(false);

  // Cache for parent paths to avoid repeated API calls
  const [pathCache, setPathCache] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadParentPath = async () => {
      if (!parentId) {
        setParentFullSlug("");
        return;
      }

      // Check cache first
      if (pathCache[parentId]) {
        setParentFullSlug(pathCache[parentId]);
        return;
      }

      setIsLoadingParentPath(true);
      try {
        const res = await fetch(`${API}/pages/${parentId}/full-path`);
        const result = await res.json();
        const full_slug = result?.data;
        setParentFullSlug(full_slug);
        // Cache the result
        setPathCache((prev) => ({ ...prev, [parentId]: full_slug }));
      } catch (error) {
        console.error("Failed to load parent path:", error);
      } finally {
        setIsLoadingParentPath(false);
      }
    };

    loadParentPath();
  }, [parentId, pathCache]);

  const debouncedRequest = useDebounce(async () => {
    setIsSearching(true);
    try {
      const res = await fetch(`${API}/search-parent?q=${searchQuery}`);
      const result = await res.json();
      if (result?.data) {
        setSearchResults(result.data);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  });

  function handleSearchQueryChange(v: string) {
    setSearchQuery(v);
    debouncedRequest();
  }

  // Calculate full slug preview
  const fullSlugPreview = useMemo(() => {
    if (!value) return parentFullSlug || "/";
    if (!parentFullSlug) return "/" + value;
    return parentFullSlug + "/" + value;
  }, [value, parentFullSlug]);

  const handleParentSelect = async (page: { id: string; title: string }) => {
    setIsLoadingParentPath(true);

    try {
      // Fetch the full path for selected parent
      const res = await fetch(`${API}/pages/${page.id}/full-path`);
      const result = await res.json();
      const full_slug = result?.data;
      // Update parent
      onParentChange(page.id);
      setParentFullSlug(full_slug);
      // Cache it
      setPathCache((prev) => ({ ...prev, [page.id]: full_slug }));
      setShowParentPicker(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to select parent:", error);
    } finally {
      setIsLoadingParentPath(false);
    }
  };

  const handleNoParent = () => {
    onParentChange(null);
    setParentFullSlug("");
    setShowParentPicker(false);
    setSearchQuery("");
  };

  const slugifyInput = (input: string) => {
    return input
      .toLowerCase()
      .trim()
      .replace(/^\/+|\/+$/g, "") // Remove leading/trailing slashes
      .replace(/[^\w\s-]/g, "") // allow only word character (a-z, A-Z, 0-9, _), whitespace and dash
      .replace(/\s+/g, "-") // Replaces one or more spaces with a single hyphen (-)
      .replace(/-+/g, "-"); // Replaces multiple consecutive hyphens with a single hyphen
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // const slugified = slugify(e.currentTarget.value);
    const slugified = slugifyInput(e.currentTarget.value);
    onChange(slugified);
  };

  return (
    <div className="flex flex-col gap-y-3">
      {/* Page Slug Input */}
      <div className="relative flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2">
          <label htmlFor="slug" className="font-semibold text-sm">
            Slug
          </label>
          <div className="">
            <button
              type="button"
              onClick={() => {
                const slugified_title = slugify(title ?? "");
                console.log("slugified_title", slugified_title);

                onChange(slugified_title);
              }}
              className="text-xs leading-none px-2 py-1 bg-zinc-100 border border-zinc-200 hover:bg-zinc-200/70 text-zinc-600 hover:text-zinc-900 rounded"
            >
              Auto
            </button>
          </div>
        </div>
        <div className="relative">
          <Input
            id="slug"
            value={value}
            onChange={handleSlugChange}
            placeholder="about-us"
          />
          <Link2 className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Enter the slug for this page (lowercase, hyphens only). For homepage,
          leave it blank and do not set parent page.
        </p>
      </div>

      {/* Parent Selector */}
      <div>
        <label className="font-semibold text-sm">Parent Page</label>
        <div className="flex gap-2 items-start">
          <div className="flex-1 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 flex items-start">
            {isLoadingParentPath ? (
              <>
                <Loader2 className="w-4 h-4 text-blue-500 mr-2 animate-spin" />
                <span className="text-sm text-gray-500">
                  Loading parent path...
                </span>
              </>
            ) : parentTitle ? (
              <>
                <FolderOpen className="w-4 h-4 text-gray-400 mr-2" />
                <div className="-mt-0.5 flex flex-col flex-1 gap-y-0.5">
                  <span className="text-sm text-gray-700 font-medium leading-[1.2]">
                    {parentTitle}
                  </span>
                  {parentFullSlug && (
                    <span className="text-xs text-gray-500 leading-[1.2]">
                      {parentFullSlug}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <Home className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-500">
                  No parent (root level)
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setShowParentPicker(!showParentPicker)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {showParentPicker ? "Cancel" : "Change"}
          </button>
        </div>

        {/* Parent Picker with Search */}
        {showParentPicker && (
          <div className="mt-2 border border-gray-200 rounded-md bg-white shadow-lg">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchQueryChange(e.target.value)}
                  placeholder="Search pages..."
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto">
              {/* No Parent Option */}
              <button
                onClick={handleNoParent}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 flex items-center"
              >
                <Home className="w-4 h-4 text-gray-400 mr-3" />
                <span className="text-sm text-gray-700">
                  No parent (root level)
                </span>
              </button>

              {/* Search Results */}
              {isSearching ? (
                <div className="px-4 py-8 text-center">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Searching pages...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-500">No pages found</p>
                </div>
              ) : (
                searchResults.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => handleParentSelect(page)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-center"
                  >
                    <FolderOpen className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">{page.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Slug Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full URL Path (Preview)
        </label>
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <code className="text-sm font-mono text-blue-700 font-semibold">
              {fullSlugPreview}
            </code>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          This is the final URL path that will be used for this page
        </p>
      </div>
    </div>
  );
}
