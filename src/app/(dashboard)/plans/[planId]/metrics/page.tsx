import { MetricsView } from "@/components/metrics/metrics-view";

export default async function PlanMetricsPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  return <MetricsView planId={planId} />;
}
