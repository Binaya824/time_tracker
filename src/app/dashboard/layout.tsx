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
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar role={user.role} name={user.name} email={user.email} />
      <main className="flex-1 min-w-0 w-0 overflow-auto scrollbar-thin bg-slate-100">
        {children}
      </main>
    </div>
  );
}
