import MileClient from "./clients";
import { mdxToTree } from "@milejs/core/data";

async function getSourceSomeHow() {
	return `---
id: test
slug: test
title: Test Frontmatter
---

<Hero id="hero1" type="hero" className="" />
<Featured id="featured1" type="featured" className="mi-max-w-5xl mi-mx-auto mi-p-4" />
	`
}

export default async function Page({ params, searchParams }: { params: Promise<{ milePath?: string[] }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
	const data = getData();

	const source = await getSourceSomeHow();
	if (!source) {
		return <ErrorComponent error="The source could not found !" />;
	}

	const { result, error } = await mdxToTree(source);
	// if (error) {
	// 	return <ErrorComponent error={error} />;
	// }
	console.log('result', result);

	return (
		<>
			<MileClient data={result} params={params} searchParams={searchParams} />
		</>
	)
}

type Props = {
	error: Error | string;
};

function ErrorComponent({ error }: Props) {
	return (
		<div id="mdx-error">
			<pre style={{ color: "var(--error)" }}>
				<code>{typeof error === "string" ? error : error.message}</code>
			</pre>
		</div>
	);
}

function getData() {
	return {
		id: "test",
		slug: "test",
		title: "Test page",
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

