import { authedGet } from "@/lib/route-helpers";
import { fail } from "@/lib/api-response";
import type { FlashProxyClient } from "@/lib/flashproxy/client";

/** metric slug -> client call. Keeps all 8 metrics behind one route. */
const METRICS: Record<
  string,
  (c: FlashProxyClient, id: string, hours: number) => Promise<{ data: unknown; status: number }>
> = {
  summary: (c, id, h) => c.getMetricsSummary(id, h),
  throughput: (c, id, h) => c.getThroughput(id, h),
  latency: (c, id, h) => c.getLatency(id, h),
  errors: (c, id, h) => c.getErrors(id, h),
  "status-codes": (c, id, h) => c.getStatusCodes(id, h),
  destinations: (c, id, h) => c.getDestinations(id, h),
  "hourly-usage": (c, id, h) => c.getHourlyUsage(id, h),
  "error-messages": (c, id, h) => c.getErrorMessages(id, h),
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ planId: string; metric: string }> },
) {
  const { planId, metric } = await params;
  const call = METRICS[metric];
  if (!call) return fail(`Unknown metric "${metric}"`, 404, "UNKNOWN_METRIC");

  const hoursParam = new URL(request.url).searchParams.get("hours");
  const hours = Math.min(168, Math.max(1, Number(hoursParam) || 24));

  return authedGet(
    "view_metrics",
    `/api/plans/${planId}/metrics/${metric}`,
    (c) => call(c, planId, hours),
    { planId, metric, hours },
  );
}
