import {defineConfig} from "tsup";

export default defineConfig((options) => ({
	entryPoints: ["exports/api.ts"],
	format: ["cjs", "esm"],
	dts: true,
	sourcemap: true,
	bundle: true,
	// external: ["react", "react-dom"],
	...options,
}));
