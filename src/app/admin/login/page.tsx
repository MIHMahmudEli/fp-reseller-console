import { redirect } from "next/navigation";

// Login is unified at /login (role is detected from the credential).
export default function AdminLoginRedirect() {
  redirect("/login");
}
