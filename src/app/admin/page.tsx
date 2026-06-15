import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { AdminView } from "@/components/admin/admin-view";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return <AdminView />;
}
