import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={user.role} name={user.name} email={user.email} />
      <main className="flex-1 overflow-auto bg-slate-50">{children}</main>
    </div>
  );
}
