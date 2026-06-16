"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Server,
  Zap,
} from "lucide-react";
import { apiPost } from "@/lib/fetcher";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/plans", label: "Plans", icon: Server },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
        <Zap className="h-[18px] w-[18px]" fill="currentColor" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">FlashProxy</span>
    </Link>
  );
}

export function AppShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  async function logout() {
    setLoggingOut(true);
    try {
      await apiPost("/api/auth/logout");
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/70 bg-surface/70 px-4 py-5 backdrop-blur-xl md:flex">
        <div className="px-2">
          <Brand />
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-accent-soft text-accent-text"
                    : "text-muted hover:bg-subtle/80 hover:text-fg",
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] transition-transform group-hover:scale-110",
                    active ? "text-accent-text" : "text-faint",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-border/70 bg-surface p-3 shadow-soft">
          <div className="px-1 text-xs text-faint">Signed in</div>
          <div className="mt-0.5 px-1 font-mono text-sm text-fg">{label}</div>
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
        <Brand />
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
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/70 bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-accent-text" : "text-faint",
              )}
            >
              <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
