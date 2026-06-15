import { BalanceCard } from "@/components/balance-card";
import { PricingTable } from "@/components/pricing-table";
import { TransactionsTable } from "@/components/transactions-table";
import { PageHeader } from "@/components/ui/page-header";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        subtitle="Balance, transactions, and your pricing."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <BalanceCard delay={60} />
        <div className="lg:col-span-2">
          <PricingTable delay={120} />
        </div>
      </div>

      <TransactionsTable delay={180} />
    </div>
  );
}
