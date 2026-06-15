import { authedGet } from "@/lib/route-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  return authedGet(
    "view_plan",
    `/api/plans/${planId}`,
    (c) => c.getPlan(planId),
    { planId },
  );
}
