import "server-only";
import { createHash } from "node:crypto";

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
