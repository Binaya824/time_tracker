import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import StatCard from "@/components/StatCard";
import Link from "next/link";
import Badge from "@/components/Badge";

export default async function AdminDashboard() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") redirect("/login");

  await connectDB();

  const [totalUsers, totalProjects, totalTasks, recentProjects] = await Promise.all([
    User.countDocuments(),
    Project.countDocuments(),
    Task.countDocuments(),
    Project.find()
      .populate("managers", "name")
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const managers = await User.countDocuments({ role: "manager" });
  const employees = await User.countDocuments({ role: "employee" });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back, {authUser.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={totalUsers} icon="👥" color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Projects" value={totalProjects} icon="📁" color="bg-blue-50 text-blue-600" />
        <StatCard label="Tasks" value={totalTasks} icon="✅" color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Managers" value={managers} icon="👔" color="bg-violet-50 text-violet-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Projects</h2>
            <Link
              href="/dashboard/admin/projects"
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {recentProjects.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">No projects yet</p>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((p) => (
                <div
                  key={p._id.toString()}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {(p.managers as { name: string }[]).map((m) => m.name).join(", ") || "No manager"}
                    </p>
                  </div>
                  <Badge variant={p.status as "active" | "completed" | "on_hold"} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/admin/users"
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <span className="text-xl">👤</span>
              <div>
                <p className="text-sm font-medium text-slate-900">Manage Users</p>
                <p className="text-xs text-slate-500">{employees} employees, {managers} managers</p>
              </div>
            </Link>
            <Link
              href="/dashboard/admin/projects"
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <span className="text-xl">📁</span>
              <div>
                <p className="text-sm font-medium text-slate-900">Manage Projects</p>
                <p className="text-xs text-slate-500">{totalProjects} total projects</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
