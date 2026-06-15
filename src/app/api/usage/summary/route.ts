import { authedGet } from "@/lib/route-helpers";

export function GET() {
  return authedGet("view_usage", "/api/usage/summary", (c) => c.getUsageSummary());
}
