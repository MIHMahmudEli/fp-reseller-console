import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated once at startup. Importing this from a
 * Client Component is a build error (server-only), which keeps secrets server-side.
 */
const schema = z.object({
  FLASHPROXY_API_BASE_URL: z
    .string()
    .url()
    .default("https://rapi.flashproxy.com/api/v1"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 chars"),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
