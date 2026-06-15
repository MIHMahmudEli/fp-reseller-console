import { authedGet } from "@/lib/route-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  return authedGet(
    "view_plan",
    `/api/plans/${planId}/usage`,
    (c) => c.getPlanUsage(planId),
    { planId, resource: "usage" },
  );
}
