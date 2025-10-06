import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import { config } from "dotenv";
import ws from 'ws';
config({ path: ".env" }); // or .env.local
neonConfig.webSocketConstructor = ws;
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });
