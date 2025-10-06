import type { UploadHookControl } from "better-upload/client";
import { Loader2, Upload } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";

type UploadButtonProps = {
	control: UploadHookControl<false>;
	accept?: string;
	metadata?: Record<string, unknown>;
	uploadOverride?: (...args: Parameters<UploadHookControl<false>["upload"]>) => void;
	//
	label?: string;
};

export function UploadButton({
	control: { upload, isPending },
	accept,
	metadata,
	uploadOverride,
	label,
}: UploadButtonProps) {
	const id = useId();

	return (
		<Button disabled={isPending} className="relative text-sm" type="button" variant="secondary">
			<label htmlFor={id} className="absolute inset-0 /cursor-pointer">
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
						e.target.value = "";
					}}
				/>
			</label>
			{isPending ? (
				<>
					<Loader2 className="size-4 animate-spin" />
					{label ?? "Uploading..."}
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
