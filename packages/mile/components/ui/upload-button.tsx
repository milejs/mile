import { Button } from '@/components/ui/button';
import type { UploadHookControl } from 'better-upload/client';
import { Loader2, Upload } from 'lucide-react';
import { useId } from 'react';

type UploadButtonProps = {
  control: UploadHookControl<false>;
  accept?: string;
  metadata?: Record<string, unknown>;
  uploadOverride?: (
    ...args: Parameters<UploadHookControl<false>['upload']>
  ) => void;
  label?: string;
  is_disabled?: boolean;

  // Add any additional props you need.
};

export function UploadButton({
  control: { upload, isPending },
  accept,
  metadata,
  uploadOverride,
  label,
  is_disabled,
}: UploadButtonProps) {
  const id = useId();

  return (
    <Button disabled={isPending || is_disabled} className="relative" type="button">
      <label htmlFor={id} className="absolute inset-0 cursor-pointer">
        <input
          id={id}
          className="absolute inset-0 size-0 opacity-0"
          type="file"
          accept={accept}
          onChange={(e) => {
            if (e.target.files?.[0] && !isPending) {
              if (uploadOverride) {
                uploadOverride(e.target.files[0], { metadata });
              } else {
                upload(e.target.files[0], { metadata });
              }
            }
            e.target.value = '';
          }}
        />
      </label>
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {label ?? "Upload file"}
        </>
      ) : (
        <>
          <Upload className="size-4" />
          {label ?? "Upload file"}
        </>
      )}
    </Button>
  );
}

type UploadsButtonProps = {
  control: UploadHookControl<true>;
  accept?: string;
  metadata?: Record<string, unknown>;
  uploadOverride?: (
    ...args: Parameters<UploadHookControl<true>['upload']>
  ) => void;
  label?: string;
  is_disabled?: boolean;

  // Add any additional props you need.
};

export function UploadsButton({
  control: { upload, isPending },
  accept,
  metadata,
  uploadOverride,
  label,
  is_disabled,
}: UploadsButtonProps) {
  const id = useId();

  return (
    <Button disabled={isPending || is_disabled} className="relative" type="button">
      <label htmlFor={id} className="absolute inset-0 cursor-pointer">
        <input
          multiple
          id={id}
          className="absolute inset-0 size-0 opacity-0"
          type="file"
          accept={accept}
          onChange={(e) => {
            if (e.target.files && !isPending) {
              if (uploadOverride) {
                uploadOverride(e.target.files, { metadata });
              } else {
                upload(e.target.files, { metadata });
              }
            }
            e.target.value = '';
          }}
        />
      </label>
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {label ?? "Upload file"}
        </>
      ) : (
        <>
          <Upload className="size-4" />
          {label ?? "Upload file"}
        </>
      )}
    </Button>
  );
}
