import { z } from "zod";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { fail, ok } from "@/lib/api-response";

const bodySchema = z.object({ token: z.string().min(1) });

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail("Token required", 400);

  // Constant-ish comparison; admin area is disabled when no token is configured.
  if (!env.ADMIN_TOKEN || parsed.data.token !== env.ADMIN_TOKEN) {
    return fail("Invalid admin token", 401, "INVALID_ADMIN_TOKEN");
  }

  const session = await getSession();
  session.isAdmin = true;
  await session.save();
  return ok({ isAdmin: true });
}
