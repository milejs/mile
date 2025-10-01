import "@milejs/core/mile.css";
import { App } from "@milejs/core/app";
import { Providers } from "../providers";

export default function Page({ params }: { params: Promise<{ mileApp: string[] }> }) {
	return (
		<Providers>
			<App params={params} />
		</Providers>
	);
}
