// import { drizzle } from "drizzle-orm/neon-http";
// import { neon, neonConfig } from "@neondatabase/serverless";
// import { config } from "dotenv";
// import ws from "ws";
// config({ path: ".env", quiet: true }); // or .env.local
// neonConfig.webSocketConstructor = ws;
// const sql = neon(process.env.DATABASE_URL!);
// export const db = drizzle({ client: sql });

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool });
