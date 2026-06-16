import { z } from "zod";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { FlashProxyClient, FlashProxyError } from "@/lib/flashproxy/client";
import { getSession } from "@/lib/session";
import { hashApiKey, keyLabel, safeEqual } from "@/lib/crypto";
import { logAudit, upsertReseller } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  // One field for both principals: a reseller API key or the operator token.
  apiKey: z.string().min(8, "Credential looks too short"),
});

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  const ip = await clientIp();
  const limit = rateLimit(`login:${ip}`, 10, 60_000);
  if (!limit.ok) {
    return fail(
      `Too many attempts. Try again in ${limit.retryAfter}s.`,
      429,
      "RATE_LIMITED",
    );
  }

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
  const credential = parsed.data.apiKey.trim();

  // 1) Operator token first (local, constant-time). Avoids sending it upstream.
  if (env.ADMIN_TOKEN && safeEqual(credential, env.ADMIN_TOKEN)) {
    const session = await getSession();
    session.isAdmin = true;
    await session.save();
    await logAudit({
      event: "admin_login_success",
      method: "POST",
      path: "/api/auth/login",
      status: 200,
    });
    return ok({ role: "admin" });
  }

  // 2) Otherwise treat it as a reseller API key and validate upstream.
  let balanceCents: number | undefined;
  try {
    const balance = await new FlashProxyClient(credential).verifyKey();
    balanceCents = balance.balance_cents;
  } catch (err) {
    if (err instanceof FlashProxyError && (err.status === 401 || err.status === 403)) {
      // Generic message — don't reveal whether it was a bad key vs bad token.
      return fail("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }
    return fail("Could not reach the FlashProxy API. Try again.", 502, "UPSTREAM_DOWN");
  }

  const keyHash = hashApiKey(credential);
  const label = keyLabel(credential);
  const resellerId = await upsertReseller({ keyHash, label, balanceCents });

  const session = await getSession();
  session.apiKey = credential;
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

  return ok({ role: "reseller", label });
}
