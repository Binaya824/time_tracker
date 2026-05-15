import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

export default async function ManagerProjectsRedirect() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  redirect("/dashboard/manager");
}
