import "server-only";
import { getSession } from "./session";
import { FlashProxyClient } from "./flashproxy/client";

/**
 * Resolve the authenticated reseller context for a request: their session plus
 * a FlashProxy client bound to their key. Returns null when not logged in.
 */
export async function getAuthedContext() {
  const session = await getSession();
  if (!session.apiKey || !session.resellerId) return null;
  return {
    session,
    resellerId: session.resellerId,
    client: new FlashProxyClient(session.apiKey),
  };
}
