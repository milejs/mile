import "@milejs/core/mile.css";
import { App } from "@milejs/core/app";
import { Providers } from "../providers";
import { Hero } from "../../components/hero";

export default function Page({ params }: { params: Promise<{ mileApp?: string[] }> }) {
	return (
		<Providers>
			<App params={params} components={components} />
		</Providers>
	);
}

const components = {
	Hero,
}
