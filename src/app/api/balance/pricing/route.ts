import { authedGet } from "@/lib/route-helpers";

export function GET() {
  return authedGet("view_pricing", "/api/balance/pricing", (c) => c.getPricing());
}
