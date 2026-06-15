import Link from "next/link";

export default async function PlanMetricsPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  return (
    <div className="space-y-4">
      <Link
        href={`/plans/${planId}`}
        className="text-sm text-slate-500 hover:underline"
      >
        ← Back to plan
      </Link>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-slate-700">
          Performance metrics
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Throughput, latency, errors, status codes and top destinations for this
          plan are coming next.
        </p>
      </div>
    </div>
  );
}
