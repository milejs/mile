import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entryPoints: [
    "exports/mile.ts",
    "exports/app.ts",
    "exports/preview.ts",
    "exports/client.ts",
    "exports/data.ts",
  ],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  bundle: true,
  external: ["react", "react-dom"],
  loader: {
    ".jpg": "base64",
    ".png": "base64",
  },
  ...options,
}));
