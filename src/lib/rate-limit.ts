import "server-only";

/**
 * Minimal in-memory fixed-window rate limiter. Good enough to blunt brute-force
 * on the login route. Note: state is per server instance, so on serverless it's
 * best-effort — a production setup would use a shared store (e.g. Upstash Redis).
 */
interface Entry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Entry>();

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { ok: true, retryAfter: 0 };
}
