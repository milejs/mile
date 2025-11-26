import { createAuthClient } from "better-auth/react";

// TODO: ts bug in better-auth
export const authClient: any = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: "http://localhost:3000",
  basePath: "/api/mile/auth",
});
