import { PlansList } from "@/components/plans-list";
import { PageHeader } from "@/components/ui/page-header";

export default function PlansPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        subtitle="All your proxy plans, their usage, and status."
      />
      <PlansList />
    </div>
  );
}
