import { z } from "zod";
import { FlashProxyClient, FlashProxyError } from "@/lib/flashproxy/client";
import { getSession } from "@/lib/session";
import { hashApiKey, keyLabel } from "@/lib/crypto";
import { logAudit, upsertReseller } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";

const bodySchema = z.object({
  apiKey: z.string().min(8, "API key looks too short"),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }
  const apiKey = parsed.data.apiKey.trim();

  // Validate the key by making a real (cheap, read-only) call upstream.
  let balanceCents: number | undefined;
  try {
    const balance = await new FlashProxyClient(apiKey).verifyKey();
    balanceCents = balance.balance_cents;
  } catch (err) {
    if (err instanceof FlashProxyError && (err.status === 401 || err.status === 403)) {
      return fail("Invalid API key", 401, "INVALID_KEY");
    }
    return fail("Could not reach the FlashProxy API. Try again.", 502, "UPSTREAM_DOWN");
  }

  // Key is valid: establish identity (by hash — never store the raw key) + session.
  const keyHash = hashApiKey(apiKey);
  const label = keyLabel(apiKey);
  const resellerId = await upsertReseller({ keyHash, label, balanceCents });

  const session = await getSession();
  session.apiKey = apiKey;
  session.resellerId = resellerId;
  session.keyHash = keyHash;
  session.label = label;
  session.loggedInAt = Date.now();
  await session.save();

  await logAudit({
    resellerId,
    event: "login_success",
    method: "POST",
    path: "/api/auth/login",
    status: 200,
    metadata: { balanceCents },
  });

  return ok({ label });
}
