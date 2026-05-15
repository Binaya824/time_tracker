import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import Link from "next/link";

export default async function ManagerDashboard() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "manager") redirect("/login");

  await connectDB();

  const projects = await Project.find({ managers: authUser.userId })
    .populate("employees", "name");

  const projectIds = projects.map((p) => p._id);
  const tasks = await Task.find({ project: { $in: projectIds } });

  const tasksByStatus = tasks.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Manager Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back, {authUser.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="My Projects" value={projects.length} icon="📁" color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Total Tasks" value={tasks.length} icon="📋" color="bg-blue-50 text-blue-600" />
        <StatCard label="In Progress" value={tasksByStatus["in_progress"] ?? 0} icon="⚡" color="bg-yellow-50 text-yellow-600" />
        <StatCard label="Completed" value={tasksByStatus["completed"] ?? 0} icon="✅" color="bg-green-50 text-green-600" />
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-4">My Projects</h2>
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          You haven&apos;t been assigned to any projects yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const projectTasks = tasks.filter(
              (t) => t.project.toString() === p._id.toString()
            );
            return (
              <div key={p._id.toString()} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">{p.name}</h3>
                  <Badge variant={p.status as "active" | "completed" | "on_hold"} />
                </div>

                {p.description && (
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">{p.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                  <span>📋 {projectTasks.length} tasks</span>
                  <span>👥 {(p.employees as { name: string }[]).length} employees</span>
                </div>

                <Link
                  href={`/dashboard/manager/projects/${p._id}`}
                  className="block w-full text-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Manage Tasks →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
