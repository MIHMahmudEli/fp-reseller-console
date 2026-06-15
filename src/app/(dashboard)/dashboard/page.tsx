import { BalanceCard } from "@/components/balance-card";
import { RealtimeCard } from "@/components/realtime-card";
import { UsageSummaryCard } from "@/components/usage-summary";
import { PageHeader } from "@/components/ui/page-header";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Overview" subtitle="Your account at a glance." />

      <RealtimeCard delay={60} />

      <div className="grid gap-6 lg:grid-cols-3">
        <BalanceCard delay={120} />
        <div className="lg:col-span-2">
          <UsageSummaryCard delay={180} />
        </div>
      </div>
    </div>
  );
}
