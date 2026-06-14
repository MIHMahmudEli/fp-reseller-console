import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations use the Supabase DIRECT connection (port 5432); DDL can't run
// through the pgbouncer pool. Fall back to a placeholder so `prisma generate`
// works offline (it never connects) — `migrate`/`db push` will fail clearly
// until a real DIRECT_URL is set.
const migrateUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://user:pass@localhost:5432/placeholder";

/**
 * Prisma 7 config. The CLI (migrate/generate) reads the connection URL from
 * here. We use DIRECT_URL for migrations (Supabase direct connection, port
 * 5432) since DDL can't run through the pgbouncer pool. The runtime client uses
 * the pooled DATABASE_URL via the pg driver adapter (see src/lib/prisma.ts).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrateUrl,
  },
});
