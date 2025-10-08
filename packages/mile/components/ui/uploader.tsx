"use client";

import { useUploadFile, useUploadFiles } from "better-upload/client";
import { toast } from "sonner";
import { UploadButton, UploadsButton } from "./upload-button";


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
		onUploadComplete: (upload) => {
			toast.success(`Uploaded ${upload.file.name}`);
			onSuccess?.(upload);
		},
		onUploadBegin: ({ file }) => {
			toast.info(`Uploading ${file.name}`);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	return <UploadButton control={control} accept="image/*" label={label} is_disabled={is_disabled} />;
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
		onUploadComplete: (upload) => {
			toast.success(`${upload.files.length} files uploaded`);
			onSuccess?.(upload);
		},
		onUploadBegin: (upload) => {
			toast.info(`Upload starts`);
		},
		onError: (error) => {
			console.error('error', error);
			toast.error(error.message);
		},
	});

	return <UploadsButton control={control} accept="image/*" label={label} is_disabled={is_disabled} />;
}
