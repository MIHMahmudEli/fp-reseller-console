import { PlanDetail } from "@/components/plan-detail";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  return <PlanDetail planId={planId} />;
}
