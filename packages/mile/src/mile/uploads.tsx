import { getImageDimension, Uploader } from "@/components/ui/uploader";
import { generateId } from "@/lib/generate-id";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
// editor
import {
  BlockSchema,
  blockHasType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  FilePanelProps,
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
  useSelectedBlocks,
} from "@blocknote/react";
import { ImageIcon } from "lucide-react";
import { Field } from "@base-ui-components/react/field";
import { Input } from "@/components/ui/input";
import { filesize } from "./utils";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;
const NEXT_PUBLIC_IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL;

/**
 * File Replace Button for Editor
 */

// Copied with minor changes from:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/FormattingToolbar/DefaultButtons/FileReplaceButton.tsx
// Opens Uppy file panel instead of the default one.
export const FileReplaceButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const selectedBlocks = useSelectedBlocks(editor);

  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsOpen(false);
  }, [selectedBlocks]);

  const block = selectedBlocks.length === 1 ? selectedBlocks[0] : undefined;

  if (
    block === undefined ||
    !blockHasType(block, editor, block.type, {
      url: "string",
    }) ||
    !editor.isEditable
  ) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root opened={isOpen} position={"bottom"}>
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          mainTooltip={
            dict.formatting_toolbar.file_replace.tooltip[block.type] ||
            dict.formatting_toolbar.file_replace.tooltip["file"]
          }
          label={
            dict.formatting_toolbar.file_replace.tooltip[block.type] ||
            dict.formatting_toolbar.file_replace.tooltip["file"]
          }
          icon={<ImageIcon />}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-panel-popover"}
        variant={"panel-popover"}
      >
        {/* Replaces default file panel with our Uppy one. */}
        <UploadFilePanel block={block as any} />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};

export function UploadFilePanel(props: FilePanelProps) {
  const { block } = props;
  const editor = useBlockNoteEditor();
  console.log("block", block);

  function handleConfirmFile(file_id: string, data: any) {
    console.log("data", data);

    if (!data) {
      toast.error(
        `Selecting file failed. Please choose different file. Or refresh the page and try agian.`,
      );
      return;
    }
    const image_url = `${NEXT_PUBLIC_IMAGE_URL}/${data.filepath}`;
    const updateData = {
      props: {
        // name: file?.name,
        name: data.name,
        url: image_url,
        caption: data.alt,
        previewWidth: 512,
      },
    };
    editor.updateBlock(block, updateData);
  }

  async function handleUploadSuccess(upload: any) {
    // save db
    await mutate(`/medias`, async (prev: any) => {
      const res = await saveImagesToDB([
        {
          id: generateId(),
          type: upload.file.type,
          size: upload.file.size,
          filepath: upload.file.objectInfo.key,
          width: upload.file.width,
          height: upload.file.height,
        },
      ]);
      return prev ? [...prev, ...res] : res;
    });

    const image_url = `${NEXT_PUBLIC_IMAGE_URL}/${upload.file.objectInfo.key}`;
    const updateData = {
      props: {
        // name: file?.name,
        name: upload.file.name,
        url: image_url,
        previewWidth: 512,
      },
    };
    editor.updateBlock(block, updateData);
  }

  return (
    <div className="flex flex-col gap-y-2 bg-white">
      <Uploader
        onSuccess={handleUploadSuccess}
        label="Upload image"
        is_disabled={false}
      />
      <ImageGallery size="compact" handleConfirmFile={handleConfirmFile} />
    </div>
  );
}

export function ImageGallery({
  size,
  initialSelectedFileId,
  handleConfirmFile,
}: {
  size?: "default" | "compact";
  initialSelectedFileId?: string;
  handleConfirmFile: (file_id: string, data: any) => void;
}) {
  const [selectedFileId, setSelectedFileId] = useState(initialSelectedFileId);
  const [isPending, setIsPending] = useState(false);
  const { data, isValidating } = useMediaFile(selectedFileId);

  return (
    <div
      className={`flex flex-col overflow-hidden ${size === "compact" ? "w-[720px] h-[400px]" : "flex-1"}`}
    >
      <div
        className={`flex-1 overflow-hidden px-3 grid ${size === "compact" ? "grid-cols-[1fr_200px]" : "grid-cols-[1fr_300px]"} gap-2`}
      >
        <div className="pb-4 overflow-y-auto">
          <MediaFiles
            size={size}
            selectedFileId={selectedFileId}
            handleSelectFile={setSelectedFileId}
          />
        </div>
        <div className="overflow-y-auto pt-4 pb-8 px-4 bg-gray-100">
          <MediaMetadata
            size={size}
            selectedFileId={selectedFileId}
            setIsPending={setIsPending}
          />
        </div>
      </div>
      <div className="py-2 px-3 flex-none border-t bg-zinc-200 rounded-b-lg flex justify-end">
        <button
          disabled={isPending || isValidating}
          onClick={() => {
            if (selectedFileId) {
              handleConfirmFile(selectedFileId, data);
            }
          }}
          className="mr-2 my-1 py-2 px-3 rounded-md bg-blue-600 text-xs text-white hover:bg-blue-700 transition-colors cursor-default disabled:opacity-50"
        >
          Select
        </button>
      </div>
    </div>
  );
}

function fetchStringKey(key: string) {
  return fetch(`${API}${key}`).then((r) => r.json());
}

function useMediaFile(media_id?: string) {
  return useSWR(media_id ? `/medias/${media_id}` : null, fetchStringKey);
}

function useMediaFiles() {
  return useSWR(`/medias`, fetchStringKey);
}

function MediaFiles({
  size,
  selectedFileId,
  handleSelectFile,
}: {
  size?: "default" | "compact";
  selectedFileId?: string;
  handleSelectFile: (fileId: string) => void;
}) {
  const { data, error, isLoading } = useMediaFiles();
  if (error || data?.error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  return (
    <MediaFilesGrid
      size={size}
      data={data}
      selectedFileId={selectedFileId}
      handleSelectFile={handleSelectFile}
    />
  );
}

function MediaFilesGrid({
  size,
  data,
  selectedFileId,
  handleSelectFile,
}: {
  size?: "default" | "compact";
  data: any[];
  selectedFileId?: string;
  handleSelectFile: (fileId: string) => void;
}) {
  if (!data || data.length === 0) {
    return <div className="">No files</div>;
  }
  return (
    <div
      className={`grid ${size === "compact" ? "grid-cols-3" : "grid-cols-4"} gap-4 items-start`}
    >
      {data.map((e: any) => (
        <MediaFileCard
          size={size}
          data={e}
          key={e.id}
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
  size,
  data,
  selectedFileId,
  handleSelectFile,
}: {
  size?: "default" | "compact";
  data: any;
  selectedFileId?: string;
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
        className={`${selectedFileId === data.id ? "bg-blue-100" : "bg-zinc-100"} ${size === "compact" ? "py-3 h-[110px]" : "py-5 h-[180px]"} flex justify-center`}
      >
        <img
          src={getImageUrl(data.filepath)}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="px-2 py-2">
        <div
          className={`${size === "compact" ? "text-xs leading-3" : "text-sm leading-4"} select-text`}
        >
          {getFileName(data.filepath)}
        </div>
      </div>
    </button>
  );
}

function MediaMetadata({
  size,
  selectedFileId,
  setIsPending,
}: {
  size?: "default" | "compact";
  selectedFileId?: string;
  setIsPending: (v: boolean) => void;
}) {
  const { data, error, isLoading, isValidating } = useMediaFile(selectedFileId);
  if (error || data?.error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  if (!data) return null;
  if (data.type == null) {
    return (
      <div className="">
        <h2 className="mb-4">Media details</h2>
        <div className="mb-4 text-xs">
          <h3 className="mb-1 font-medium">Unknown media file type.</h3>
        </div>
      </div>
    );
  }
  if (selectedFileId) {
    if (data.type.startsWith("image/")) {
      return (
        <ImageDetails
          size={size}
          selectedFileId={selectedFileId}
          data={data}
          setIsPending={setIsPending}
        />
      );
    }
  }

  return null;
}

function ImageDetails({
  size,
  selectedFileId,
  data,
  setIsPending,
}: {
  size?: "default" | "compact";
  selectedFileId: string;
  data: any;
  setIsPending: (v: boolean) => void;
}) {
  return (
    <div className="">
      <h2 className="mb-4 font-semibold">Media details</h2>

      <div
        className={`mb-4 ${size === "compact" ? "grid grid-cols-[60px_1fr] gap-x-1" : "grid grid-cols-[112px_1fr] gap-x-3"} `}
      >
        <div className="mb-2">
          <img src={getImageUrl(data.filepath)} alt="" />
        </div>
        <div className="mb-4 text-xs">
          <h3 className="mb-1.5 font-medium">{data.filepath}</h3>
          <div className="mb-0.5">{filesize(data.size)}</div>
          <div className="text-gray-500">
            {new Date(data.created_at).toString()}
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
        <div className="">
          <ImageURL defaultValue={getImageUrl(data.filepath)} />
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
        render={<Textarea rows={4} />}
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
  fetch(`${API}/medias/${file_id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then((r) => r.json())
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

export function makeUploadFile(upload: (file: File) => Promise<{ file: any }>) {
  return async function uploadFile(file: File) {
    const result = await upload(file);
    // console.log("result", result);
    const dims = await getImageDimension(file).catch((e) => {
      console.error("Error getting image dimensions", e);
      return undefined;
    });
    const image_url = `${NEXT_PUBLIC_IMAGE_URL}/${result.file.objectInfo.key}`;

    // save db
    mutate(`/medias`, async (prev: any) => {
      const res = await saveImagesToDB([
        {
          id: generateId(),
          type: result.file.type,
          size: result.file.size,
          filepath: result.file.objectInfo.key,
          width: dims?.width,
          height: dims?.height,
        },
      ]);
      return prev ? [...prev, ...res] : res;
    });

    return image_url;
  };
}

export async function saveImagesToDB(payload: any) {
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
  const res = await resp.json();
  return res;
}
