"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiGet } from "@/lib/fetcher";
import { formatGB, productLabel, supportsMetrics } from "@/lib/format";
import { AXIS, COLORS, tooltipStyle } from "@/lib/chart";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Destination,
  type ErrorsPoint,
  type LatencyPoint,
  type MetricsSummary,
  type Plan,
  type StatusCodesPoint,
  type ThroughputPoint,
  type TimeSeries,
} from "@/lib/flashproxy/types";

const RANGES = [
  { label: "24h", hours: 24 },
  { label: "3d", hours: 72 },
  { label: "7d", hours: 168 },
];

const metricsSupported = supportsMetrics;

function tick(bucket: string): string {
  return bucket?.length >= 16 ? bucket.slice(5, 16) : bucket;
}

function useMetric<T>(planId: string, metric: string, hours: number) {
  return useQuery({
    queryKey: ["metrics", planId, metric, hours],
    queryFn: () => apiGet<T>(`/api/plans/${planId}/metrics/${metric}?hours=${hours}`),
  });
}

export function MetricsView({ planId }: { planId: string }) {
  const [hours, setHours] = useState(24);

  const planQ = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => apiGet<Plan>(`/api/plans/${planId}`),
  });

  const summaryQ = useMetric<MetricsSummary>(planId, "summary", hours);
  const throughputQ = useMetric<TimeSeries<ThroughputPoint>>(planId, "throughput", hours);
  const latencyQ = useMetric<TimeSeries<LatencyPoint>>(planId, "latency", hours);
  const statusQ = useMetric<TimeSeries<StatusCodesPoint>>(planId, "status-codes", hours);
  const errorsQ = useMetric<TimeSeries<ErrorsPoint>>(planId, "errors", hours);
  const destQ = useMetric<{ destinations: Destination[] }>(planId, "destinations", hours);

  const product = planQ.data?.product;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/plans/${planId}`}
            className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to plan
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Performance metrics
          </h1>
          {product && <p className="text-sm text-slate-500">{productLabel(product)} plan</p>}
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
          {RANGES.map((r) => (
            <button
              key={r.hours}
              onClick={() => setHours(r.hours)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                hours === r.hours
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {product && !metricsSupported(product) ? (
        <Card className="flex flex-col items-center p-12 text-center">
          <p className="text-sm font-medium text-slate-700">
            Metrics aren&apos;t available for {productLabel(product)} plans
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Detailed performance metrics are only collected for datacenter, shared
            ISP and IPv6 products.
          </p>
        </Card>
      ) : (
        <>
          <Summary q={summaryQ} />

          <ChartCard title="Throughput (Mbps)" q={throughputQ} empty={!throughputQ.data?.series?.length} delay={60}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={throughputQ.data?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bucket" tickFormatter={tick} {...AXIS} />
                <YAxis {...AXIS} axisLine={false} />
                <Tooltip labelFormatter={(l) => tick(String(l))} contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="mbps" name="Avg" stroke={COLORS.brand} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="peak_mbps" name="Peak" stroke={COLORS.blue} dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Connection duration (ms)" q={latencyQ} empty={!latencyQ.data?.series?.length} delay={80}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={latencyQ.data?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bucket" tickFormatter={tick} {...AXIS} />
                <YAxis {...AXIS} axisLine={false} />
                <Tooltip labelFormatter={(l) => tick(String(l))} contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="p50" name="p50" stroke={COLORS.green} dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="p95" name="p95" stroke={COLORS.amber} dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="p99" name="p99" stroke={COLORS.red} dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Upstream status codes" q={statusQ} empty={!statusQ.data?.series?.length} delay={100}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={statusQ.data?.series ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bucket" tickFormatter={tick} {...AXIS} />
                  <YAxis {...AXIS} axisLine={false} />
                  <Tooltip labelFormatter={(l) => tick(String(l))} contentStyle={tooltipStyle} />
                  <Legend />
                  <Area dataKey="s2xx" name="2xx" stackId="1" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.5} />
                  <Area dataKey="s3xx" name="3xx" stackId="1" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.5} />
                  <Area dataKey="s4xx" name="4xx" stackId="1" stroke={COLORS.amber} fill={COLORS.amber} fillOpacity={0.5} />
                  <Area dataKey="s5xx" name="5xx" stackId="1" stroke={COLORS.red} fill={COLORS.red} fillOpacity={0.5} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ErrorsChart q={errorsQ} />
          </div>

          <DestinationsTable q={destQ} />
        </>
      )}
    </div>
  );
}

/* ---------- sub-components ---------- */

interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

function ChartCard<T>({
  title,
  q,
  empty,
  delay,
  children,
}: {
  title: string;
  q: QueryLike<T>;
  empty?: boolean;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6" delay={delay}>
      <h2 className="mb-4 text-sm font-medium text-slate-700">{title}</h2>
      {q.isLoading ? (
        <Skeleton className="h-[240px] w-full" />
      ) : q.isError ? (
        <p className="text-sm text-red-600">
          {(q.error as Error)?.message ?? "Failed to load"}
        </p>
      ) : empty ? (
        <div className="flex h-[200px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
          No data in this window
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

function Summary({ q }: { q: QueryLike<MetricsSummary> }) {
  const s = q.data;
  const cards = [
    { label: "Traffic", value: s ? formatGB(s.total_mb / 1024) : "—" },
    { label: "Connections", value: s ? s.total_connections.toLocaleString() : "—" },
    {
      label: "Success rate",
      value: s?.success_rate_pct != null ? `${s.success_rate_pct.toFixed(1)}%` : "—",
    },
    { label: "Avg / Peak Mbps", value: s ? `${s.avg_mbps} / ${s.peak_mbps}` : "—" },
    { label: "Peak concurrent", value: s ? String(s.peak_concurrent) : "—" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c, i) => (
        <Card key={c.label} className="p-4" delay={i * 40}>
          <div className="text-xs uppercase tracking-wide text-slate-400">{c.label}</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
            {q.isLoading ? "…" : c.value}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ErrorsChart({ q }: { q: QueryLike<TimeSeries<ErrorsPoint>> }) {
  const series = q.data?.series ?? [];
  const totals: Record<string, number> = {};
  for (const point of series) {
    for (const [k, v] of Object.entries(point)) {
      if (k === "bucket") continue;
      totals[k] = (totals[k] ?? 0) + (Number(v) || 0);
    }
  }
  const data = Object.entries(totals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  return (
    <ChartCard title="Errors by category" q={q} empty={data.length === 0} delay={120}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" {...AXIS} />
          <YAxis type="category" dataKey="category" {...AXIS} width={90} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={COLORS.red} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function DestinationsTable({ q }: { q: QueryLike<{ destinations: Destination[] }> }) {
  const rows = q.data?.destinations ?? [];
  return (
    <ChartCard title="Top destinations" q={q} empty={rows.length === 0} delay={140}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2 pr-4 font-medium">Destination</th>
              <th className="py-2 pr-4 font-medium">Conns</th>
              <th className="py-2 pr-4 font-medium">Success</th>
              <th className="py-2 pr-4 font-medium">Errors</th>
              <th className="py-2 pr-4 font-medium">Down / Up (MB)</th>
              <th className="py-2 font-medium">p95 ms</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((d) => (
              <tr key={d.destination}>
                <td className="py-2 pr-4 font-mono text-xs text-slate-700">{d.destination}</td>
                <td className="py-2 pr-4 tabular-nums">{d.connections}</td>
                <td className="py-2 pr-4 tabular-nums text-emerald-600">{d.successes}</td>
                <td className="py-2 pr-4 tabular-nums text-red-600">{d.errors}</td>
                <td className="py-2 pr-4 tabular-nums">
                  {d.mb_received.toFixed(1)} / {d.mb_sent.toFixed(1)}
                </td>
                <td className="py-2 tabular-nums">{d.p95_ms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
