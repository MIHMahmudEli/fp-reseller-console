import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.resellerId) redirect("/login");

  return <AppShell label={session.label ?? "reseller"}>{children}</AppShell>;
}
