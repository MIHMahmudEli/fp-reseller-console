"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  LayoutDashboard,
  LogIn,
  LogOut,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/fetcher";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
  reseller: { label: string | null } | null;
}

const NAV = [
  { href: "#overview", label: "Overview", icon: LayoutDashboard },
  { href: "#resellers", label: "Resellers", icon: Users },
  { href: "#activity", label: "Activity", icon: ScrollText },
];

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
  if (event === "logout") return "bg-subtle text-muted ring-slate-500/20";
  return "bg-accent-soft text-accent-text ring-brand-600/20";
}

function AdminBrand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
        <ShieldCheck className="h-[18px] w-[18px]" />
      </span>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight">Admin</div>
        <div className="text-xs text-faint">Audit &amp; usage</div>
      </div>
    </div>
  );
}

export function AdminView() {
  const router = useRouter();
  const [eventFilter, setEventFilter] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

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
    setLoggingOut(true);
    try {
      await apiPost("/api/admin/logout");
    } finally {
      router.replace("/admin/login");
    }
  }

  const resellers = resellersQ.data?.resellers ?? [];
  const events = auditQ.data?.events ?? [];
  const eventTypes = auditQ.data?.eventTypes ?? [];

  const totalEvents = resellers.reduce((n, r) => n + r._count.auditLogs, 0);
  const logins = events.filter((e) => e.event === "login_success").length;
  const failures = events.filter((e) => e.event.includes("failure")).length;
  const loading = resellersQ.isLoading || auditQ.isLoading;

  const stats = [
    { label: "Resellers", value: resellers.length, icon: Users },
    { label: "Audit events", value: totalEvents, icon: ScrollText },
    { label: "Logins (recent)", value: logins, icon: LogIn },
    { label: "Failures (recent)", value: failures, icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/70 bg-surface/70 px-4 py-5 backdrop-blur-xl md:flex">
        <div className="px-2">
          <AdminBrand />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-all duration-150 hover:bg-subtle/80 hover:text-fg"
              >
                <Icon className="h-[18px] w-[18px] text-faint transition-transform group-hover:scale-110" />
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-border/70 bg-surface p-3 shadow-soft">
          <div className="px-1 text-xs text-faint">Operator</div>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={logout}
              disabled={loggingOut}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-subtle disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-surface/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <AdminBrand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={logout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="md:pl-64">
        <main className="mx-auto max-w-5xl space-y-8 px-4 pb-12 pt-6 sm:px-6 md:pt-8">
          <div id="overview" className="scroll-mt-20">
            <h1 className="animate-fade-in-up text-2xl font-semibold tracking-tight text-fg">
              Audit overview
            </h1>
            <p className="animate-fade-in-up mt-1 text-sm text-muted">
              Who is using the dashboard and what they do.
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="p-4" delay={i * 50}>
                  <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-faint">
                    <Icon className="h-3.5 w-3.5" />
                    {s.label}
                  </div>
                  <div className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">
                    {loading ? "…" : s.value}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Resellers */}
          <section id="resellers" className="scroll-mt-20 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-faint" />
              <h2 className="text-sm font-medium text-muted">
                Resellers ({resellers.length})
              </h2>
            </div>
            <Card className="overflow-hidden" delay={120}>
              {resellersQ.isLoading ? (
                <div className="space-y-2 p-4">
                  {[0, 1].map((i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : resellers.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-faint">
                  No resellers yet
                </p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead className="border-b border-border bg-subtle/70 text-left text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Key</th>
                          <th className="px-4 py-2.5 font-medium">Events</th>
                          <th className="px-4 py-2.5 font-medium">Last balance</th>
                          <th className="px-4 py-2.5 font-medium">First seen</th>
                          <th className="px-4 py-2.5 font-medium">Last seen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {resellers.map((r) => (
                          <tr key={r.id} className="transition-colors hover:bg-subtle">
                            <td className="whitespace-nowrap px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text">
                                  {(r.label ?? "?").replace(/\D/g, "").slice(-2) || "·"}
                                </span>
                                <span className="font-mono text-fg">{r.label ?? "—"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">{r._count.auditLogs}</td>
                            <td className="px-4 py-2.5 tabular-nums">
                              {r.lastBalanceCents != null
                                ? `$${(r.lastBalanceCents / 100).toFixed(2)}`
                                : "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                              {fmtTime(r.firstSeenAt)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                              {fmtTime(r.lastSeenAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <ul className="divide-y divide-border md:hidden">
                    {resellers.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 p-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text">
                          {(r.label ?? "?").replace(/\D/g, "").slice(-2) || "·"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-sm text-fg">{r.label ?? "—"}</div>
                          <div className="text-xs text-faint">
                            {r._count.auditLogs} events · last seen {fmtTime(r.lastSeenAt)}
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-medium tabular-nums text-fg">
                          {r.lastBalanceCents != null
                            ? `$${(r.lastBalanceCents / 100).toFixed(2)}`
                            : "—"}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </section>

          {/* Activity */}
          <section id="activity" className="scroll-mt-20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-faint" />
                <h2 className="text-sm font-medium text-muted">
                  Recent activity ({events.length})
                </h2>
              </div>
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">All events</option>
                {eventTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Card className="overflow-hidden" delay={160}>
              {auditQ.isLoading ? (
                <div className="space-y-2 p-4">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-faint">
                  No activity yet
                </p>
              ) : (
                <>
                  {/* Wide-screen table (only where there's room beside the sidebar) */}
                  <div className="hidden overflow-x-auto xl:block">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-subtle/70 text-left text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Time</th>
                          <th className="px-4 py-2.5 font-medium">Key</th>
                          <th className="px-4 py-2.5 font-medium">Event</th>
                          <th className="px-4 py-2.5 font-medium">Request</th>
                          <th className="px-4 py-2.5 font-medium">Status</th>
                          <th className="px-4 py-2.5 font-medium">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {events.map((e) => (
                          <tr key={e.id} className="transition-colors hover:bg-subtle">
                            <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                              {fmtTime(e.createdAt)}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-muted">
                              {e.reseller?.label ?? "operator"}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge className={eventClasses(e.event)}>{e.event}</Badge>
                            </td>
                            <td
                              className="max-w-[220px] truncate px-4 py-2.5 font-mono text-xs text-muted"
                              title={`${e.method ?? ""} ${e.path ?? ""}`.trim()}
                            >
                              {e.method} {e.path}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">{e.status ?? "—"}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">
                              {e.ip ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Phone / tablet / laptop cards (no horizontal cutoff) */}
                  <ul className="divide-y divide-border xl:hidden">
                    {events.map((e) => (
                      <li key={e.id} className="space-y-2 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Badge className={eventClasses(e.event)}>{e.event}</Badge>
                          <span className="shrink-0 text-xs text-faint">
                            {fmtTime(e.createdAt)}
                          </span>
                        </div>
                        <div className="break-all font-mono text-xs text-muted">
                          {e.method} {e.path}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                          <span>
                            Key <span className="font-mono text-muted">{e.reseller?.label ?? "operator"}</span>
                          </span>
                          <span>
                            Status <span className="tabular-nums text-fg">{e.status ?? "—"}</span>
                          </span>
                          <span>
                            IP <span className="break-all font-mono text-muted">{e.ip ?? "—"}</span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
