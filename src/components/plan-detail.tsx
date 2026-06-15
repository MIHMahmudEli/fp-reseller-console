"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/fetcher";
import { CopyField } from "@/components/copy-field";
import { formatDate, formatGB, productLabel, statusClasses } from "@/lib/format";
import {
  METRICS_SUPPORTED_PRODUCTS,
  type Plan,
  type PlanUsage,
} from "@/lib/flashproxy/types";

function metricsSupported(product: string): boolean {
  return (METRICS_SUPPORTED_PRODUCTS as readonly string[]).includes(product);
}

export function PlanDetail({ planId }: { planId: string }) {
  const planQ = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => apiGet<Plan>(`/api/plans/${planId}`),
  });
  const usageQ = useQuery({
    queryKey: ["plan", planId, "usage"],
    queryFn: () => apiGet<PlanUsage>(`/api/plans/${planId}/usage`),
  });

  if (planQ.isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  }
  if (planQ.isError) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {(planQ.error as Error)?.message ?? "Failed to load plan"}
      </p>
    );
  }

  const plan = planQ.data!;
  const usage = usageQ.data;
  const pct = usage ? Number(usage.percentage_used) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/plans" className="text-sm text-slate-500 hover:underline">
            ← Plans
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {productLabel(plan.product)}
          </h1>
          <p className="font-mono text-xs text-slate-400">{plan.plan_id}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${statusClasses(plan.status)}`}
        >
          {plan.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Usage */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-medium text-slate-500">Bandwidth usage</h2>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-semibold">
              {formatGB((usage?.gb_used ?? plan.limits.bytes_used / 1e9) || 0)}
            </span>
            <span className="text-sm text-slate-500">of {plan.limits.max_gb} GB</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Fact label="Used" value={`${pct.toFixed(2)}%`} />
            <Fact
              label="Days remaining"
              value={usage ? String(usage.days_remaining) : "—"}
            />
            <Fact label="Expires" value={formatDate(plan.expires_at)} />
            <Fact label="Created" value={formatDate(plan.created_at)} />
          </dl>
        </section>

        {/* Connection */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-medium text-slate-500">Connection</h2>
          <div className="mt-3 space-y-3">
            <CopyField label="Proxy string" value={plan.connection.format} />
            <div className="grid grid-cols-2 gap-3">
              <CopyField label="Host" value={plan.connection.hostname} />
              <CopyField
                label="Ports (HTTP / SOCKS)"
                value={`${plan.connection.port_http} / ${plan.connection.port_socks}`}
              />
            </div>
            <CopyField label="Username" value={plan.proxy_username} />
            <CopyField label="Password" value={plan.proxy_password} secret />
          </div>
        </section>
      </div>

      {/* Performance metrics entry point */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-700">Performance metrics</h2>
            <p className="mt-1 text-sm text-slate-500">
              {metricsSupported(plan.product)
                ? "Throughput, latency, errors, status codes and top destinations."
                : `Metrics aren't available for ${productLabel(plan.product)} plans.`}
            </p>
          </div>
          {metricsSupported(plan.product) && (
            <Link
              href={`/plans/${plan.plan_id}/metrics`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              View metrics →
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
    </div>
  );
}
