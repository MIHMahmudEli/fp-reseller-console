import { PlansList } from "@/components/plans-list";

export default function PlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="mt-1 text-sm text-slate-500">
          All your proxy plans, their usage, and status.
        </p>
      </div>
      <PlansList />
    </div>
  );
}
