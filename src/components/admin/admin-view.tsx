"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/fetcher";

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

const EVENT_STYLES: Record<string, string> = {
  login_success: "bg-emerald-50 text-emerald-700",
  login_failure: "bg-red-50 text-red-700",
  logout: "bg-slate-100 text-slate-600",
};

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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-semibold tracking-tight">Admin · Audit log</span>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {/* Resellers */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-slate-500">
            Resellers ({resellers.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
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
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-slate-700">{r.label ?? "—"}</td>
                    <td className="px-4 py-2.5">{r._count.auditLogs}</td>
                    <td className="px-4 py-2.5">
                      {r.lastBalanceCents != null
                        ? `$${(r.lastBalanceCents / 100).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtTime(r.firstSeenAt)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtTime(r.lastSeenAt)}</td>
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
        </section>

        {/* Audit events */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-500">
              Recent activity ({events.length})
            </h2>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">All events</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
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
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                      {fmtTime(e.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                      {e.reseller.label ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          EVENT_STYLES[e.event] ?? "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {e.event}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                      {e.method} {e.path}
                    </td>
                    <td className="px-4 py-2.5">{e.status ?? "—"}</td>
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
        </section>
      </main>
    </div>
  );
}
