import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time string comparison (avoids leaking the admin token via timing). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Stable, non-reversible identifier for an API key. We store this — never the
 * raw key — so the DB never holds a usable credential.
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey.trim()).digest("hex");
}

/** Display-only hint, e.g. "…b2c3". Safe to show; reveals nothing useful. */
export function keyLabel(apiKey: string): string {
  const trimmed = apiKey.trim();
  return `…${trimmed.slice(-4)}`;
}
