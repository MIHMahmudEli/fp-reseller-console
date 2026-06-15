"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LogOut, ScrollText, ShieldCheck, Users } from "lucide-react";
import { apiGet, apiPost } from "@/lib/fetcher";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface ResellerRow {
  id: string;
  label: string | null;
  lastBalanceCents: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  _count: { auditLogs: number };
}

interface AuditRow {
  id: string;
  event: string;
  method: string | null;
  path: string | null;
  status: number | null;
  ip: string | null;
  createdAt: string;
  reseller: { label: string | null };
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function eventClasses(event: string): string {
  if (event.includes("failure")) return "bg-red-50 text-red-700 ring-red-600/20";
  if (event === "login_success") return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  if (event === "logout") return "bg-slate-100 text-slate-600 ring-slate-500/20";
  return "bg-brand-50 text-brand-700 ring-brand-600/20";
}

export function AdminView() {
  const router = useRouter();
  const [eventFilter, setEventFilter] = useState("");

  const resellersQ = useQuery({
    queryKey: ["admin", "resellers"],
    queryFn: () => apiGet<{ resellers: ResellerRow[] }>("/api/admin/resellers"),
  });

  const auditQ = useQuery({
    queryKey: ["admin", "audit", eventFilter],
    queryFn: () =>
      apiGet<{ events: AuditRow[]; eventTypes: string[] }>(
        `/api/admin/audit?limit=150${eventFilter ? `&event=${eventFilter}` : ""}`,
      ),
  });

  async function logout() {
    await apiPost("/api/admin/logout");
    router.replace("/admin/login");
  }

  const resellers = resellersQ.data?.resellers ?? [];
  const events = auditQ.data?.events ?? [];
  const eventTypes = auditQ.data?.eventTypes ?? [];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">Admin · Audit log</span>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        {/* Resellers */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-medium text-slate-500">
              Resellers ({resellers.length})
            </h2>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Key</th>
                    <th className="px-4 py-2.5 font-medium">Events</th>
                    <th className="px-4 py-2.5 font-medium">Last balance</th>
                    <th className="px-4 py-2.5 font-medium">First seen</th>
                    <th className="px-4 py-2.5 font-medium">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resellers.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-slate-700">
                        {r.label ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{r._count.auditLogs}</td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {r.lastBalanceCents != null
                          ? `$${(r.lastBalanceCents / 100).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                        {fmtTime(r.firstSeenAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                        {fmtTime(r.lastSeenAt)}
                      </td>
                    </tr>
                  ))}
                  {resellers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        No resellers yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* Audit events */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-medium text-slate-500">
                Recent activity ({events.length})
              </h2>
            </div>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">All events</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Time</th>
                    <th className="px-4 py-2.5 font-medium">Key</th>
                    <th className="px-4 py-2.5 font-medium">Event</th>
                    <th className="px-4 py-2.5 font-medium">Request</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                        {fmtTime(e.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                        {e.reseller.label ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={eventClasses(e.event)}>{e.event}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-500">
                        {e.method} {e.path}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{e.status ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-500">{e.ip ?? "—"}</td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        No activity yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
