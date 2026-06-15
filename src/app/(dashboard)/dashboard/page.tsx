import { BalanceCard } from "@/components/balance-card";
import { RealtimeCard } from "@/components/realtime-card";
import { UsageSummaryCard } from "@/components/usage-summary";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Your account at a glance.</p>
      </div>

      <RealtimeCard />

      <div className="grid gap-6 lg:grid-cols-3">
        <BalanceCard />
        <div className="lg:col-span-2">
          <UsageSummaryCard />
        </div>
      </div>
    </div>
  );
}
