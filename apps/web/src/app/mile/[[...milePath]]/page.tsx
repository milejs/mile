"use client";

import "@milejs/core/mile.css";
import { Mile } from "@milejs/core";
import { Providers } from "../../providers";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ milePath?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Providers>
      <Mile params={params} searchParams={searchParams} />
    </Providers>
  );
}

// function getData() {
// 	return {
// 		id: "test",
// 		slug: "test",
// 		title: "Test page",
// 		content: {
// 			root: {
// 				type: "root",
// 				id: "root",
// 				props: {},
// 				options: {},
// 				children: ["hero1", "featured1"],
// 			},
// 			hero1: {
// 				type: "hero",
// 				id: "hero1",
// 				props: { className: "" },
// 				// options: undefined,
// 			},
// 			featured1: {
// 				type: "featured",
// 				id: "featured1",
// 				props: { className: "mi-max-w-5xl mi-mx-auto mi-p-4" },
// 				// options: {},
// 			},
// 		}
// 	}
// }
