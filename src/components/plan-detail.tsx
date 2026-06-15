"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Gauge, Plug } from "lucide-react";
import { apiGet } from "@/lib/fetcher";
import { CopyField } from "@/components/copy-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDate,
  formatGB,
  productLabel,
  statusClasses,
  supportsMetrics,
} from "@/lib/format";
import { type Plan, type PlanUsage } from "@/lib/flashproxy/types";

const metricsSupported = supportsMetrics;

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
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }
  if (planQ.isError) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        {(planQ.error as Error)?.message ?? "Failed to load plan"}
      </p>
    );
  }

  const plan = planQ.data!;
  const usage = usageQ.data;
  const pct = usage ? Number(usage.percentage_used) : 0;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/plans"
            className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Plans
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {productLabel(plan.product)}
          </h1>
          <p className="font-mono text-xs text-slate-400">{plan.plan_id}</p>
        </div>
        <Badge className={`${statusClasses(plan.status)} px-3 py-1 text-sm`}>
          {plan.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6" delay={60}>
          <CardHeader title="Bandwidth usage" icon={<Gauge className="h-4 w-4" />} />
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tabular-nums text-slate-900">
              {formatGB((usage?.gb_used ?? plan.limits.bytes_used / 1e9) || 0)}
            </span>
            <span className="text-sm text-slate-500">of {plan.limits.max_gb} GB</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-500"
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
        </Card>

        <Card className="p-6" delay={120}>
          <CardHeader title="Connection" icon={<Plug className="h-4 w-4" />} />
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
        </Card>
      </div>

      <Card className="p-6" delay={180}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-medium text-slate-700">Performance metrics</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {metricsSupported(plan.product)
                ? "Throughput, latency, errors, status codes and top destinations."
                : `Metrics aren't available for ${productLabel(plan.product)} plans.`}
            </p>
          </div>
          {metricsSupported(plan.product) && (
            <Link href={`/plans/${plan.plan_id}/metrics`}>
              <Button size="sm">View metrics</Button>
            </Link>
          )}
        </div>
      </Card>
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
