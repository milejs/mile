import type { Config } from 'drizzle-kit';
import { config } from "dotenv";
config({ path: ".env" }); // or .env.local

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
