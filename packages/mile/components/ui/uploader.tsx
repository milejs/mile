"use client";

import {
  useUploadFile,
  useUploadFiles,
  FileUploadInfo,
} from "better-upload/client";
import { toast } from "sonner";
import { UploadButton, UploadsButton } from "./upload-button";

export type { FileUploadInfo };

async function attachDimension(upload: any) {
  let dimension = undefined;
  try {
    dimension = await getImageDimension(upload.file.raw);
    console.log(`Image Width: ${dimension.width}, Height: ${dimension.height}`);
    // You can now use these dimensions for validation or other purposes
  } catch (error) {
    console.error("Error getting image dimensions:", error);
  }
  return dimension
    ? {
        ...upload,
        file: {
          ...upload.file,
          ...dimension,
        },
      }
    : upload;
}

async function attachDimensions(upload: any) {
  const dimensionPromises = upload.files.map(async (fileInfo: any) => {
    // Check if the file is an image by checking its MIME type
    if (fileInfo.raw.type.startsWith("image/")) {
      try {
        const dimensions = await getImageDimension(fileInfo.raw);
        return {
          ...fileInfo,
          ...dimensions,
        };
      } catch (error) {
        // If dimension extraction fails, return the file without dimensions
        console.error(
          `Failed to get dimensions for ${fileInfo.raw.name}:`,
          error,
        );
        return fileInfo;
      }
    }
    // Return non-image files as-is
    return fileInfo;
  });

  // Return new upload object with updated files array
  return {
    ...upload,
    files: await Promise.all(dimensionPromises),
  };
}

export function Uploader({
  onSuccess,
  label,
  is_disabled,
}: {
  onSuccess?: (upload: any) => void;
  label?: string;
  is_disabled: boolean;
}) {
  const { control } = useUploadFile({
    route: "mileupload",
    api: "/api/mile/upload",
    onUploadComplete: async (upload) => {
      toast.success(`Uploaded ${upload.file.name}`);
      const uploadWithDimension = await attachDimension(upload);
      onSuccess?.(uploadWithDimension);
    },
    onUploadBegin: async ({ file }) => {
      toast.info(`Uploading ${file.name}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <UploadButton
      control={control}
      accept="image/*"
      label={label}
      is_disabled={is_disabled}
    />
  );
}

export function Uploaders({
  onSuccess,
  label,
  is_disabled,
}: {
  onSuccess?: (upload: any) => void;
  label?: string;
  is_disabled?: boolean;
}) {
  const { control } = useUploadFiles({
    route: "mileuploads",
    api: "/api/mile/uploads",
    onUploadComplete: async (upload) => {
      toast.success(`${upload.files.length} files uploaded`);
      const uploadWithDimension = await attachDimensions(upload);
      onSuccess?.(uploadWithDimension);
    },
    onUploadBegin: (upload) => {
      toast.info(`Upload starts`);
    },
    onError: (error) => {
      console.error("error", error);
      toast.error(error.message);
    },
  });

  return (
    <UploadsButton
      control={control}
      accept="image/*"
      label={label}
      is_disabled={is_disabled}
    />
  );
}

function getImageDimension(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectURL = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectURL); // Clean up the temporary URL
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = (error) => {
      URL.revokeObjectURL(objectURL);
      reject(error);
    };

    img.src = objectURL;
  });
}
