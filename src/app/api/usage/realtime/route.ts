import { authedGet } from "@/lib/route-helpers";

export function GET() {
  return authedGet("view_usage", "/api/usage/realtime", (c) => c.getUsageRealtime());
}
