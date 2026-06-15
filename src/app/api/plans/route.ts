import { authedGet } from "@/lib/route-helpers";

export function GET() {
  return authedGet("view_plans", "/api/plans", (c) => c.getPlans());
}
