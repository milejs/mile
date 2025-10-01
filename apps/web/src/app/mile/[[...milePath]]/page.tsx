"use client";

import "@milejs/core/mile.css";
import { Mile } from "@milejs/core";
import { useRouter } from "next/navigation";
import { mileconfig } from "../../../mile.config";
import { MileProvider } from "@milejs/core/client";

export default function Page({ params, searchParams }: { params: Promise<{ milePath?: string[] }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
	const router = useRouter();
	const data = getData();

	return (
		<MileProvider config={mileconfig}>
			<Mile data={data} params={params} searchParams={searchParams} router={router} />
		</MileProvider>
	);
}

function getData() {
	return {
		id: "test",
		slug: "test",
		content: {
			root: {
				type: "root",
				id: "root",
				props: {},
				options: {},
				children: ["hero1", "featured1"],
			},
			hero1: {
				type: "hero",
				id: "hero1",
				props: { className: "" },
				// options: undefined,
			},
			featured1: {
				type: "featured",
				id: "featured1",
				props: { className: "mi-max-w-5xl mi-mx-auto mi-p-4" },
				// options: {},
			},
		}
	}
}
