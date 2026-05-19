import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import TimeEntry from "@/lib/models/TimeEntry";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import Link from "next/link";

function formatSecs(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function ManagerDashboard() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "manager") redirect("/login");

  await connectDB();

  const projects = await Project.find({ managers: authUser.userId })
    .populate("employees", "name");

  const projectIds = projects.map((p) => p._id);
  const tasks = await Task.find({ project: { $in: projectIds } })
    .populate("assignedTo", "name");

  // Employee performance
  const taskIds = tasks.map((t) => t._id);
  const timeEntries = await TimeEntry.find({ task: { $in: taskIds } });

  type EmpTask = { taskId: string; title: string; status: string; dueHour?: number; actualSeconds: number };
  type EmpPerf = { name: string; tasks: EmpTask[] };
  const empMap: Record<string, EmpPerf> = {};

  for (const t of tasks) {
    const assigned = t.assignedTo as unknown as { _id: { toString(): string }; name: string }[];
    for (const u of assigned) {
      const uid = u._id.toString();
      if (!empMap[uid]) empMap[uid] = { name: u.name, tasks: [] };
      empMap[uid].tasks.push({ taskId: t._id.toString(), title: t.title, status: t.status, dueHour: t.dueHour, actualSeconds: 0 });
    }
  }

  for (const e of timeEntries) {
    const uid = e.user.toString();
    const tid = e.task.toString();
    if (empMap[uid]) {
      const task = empMap[uid].tasks.find((t) => t.taskId === tid);
      if (task) task.actualSeconds += e.duration ?? 0;
    }
  }

  const empPerformance = Object.values(empMap);

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
                  <span>👥 {(p.employees as unknown as { name: string }[]).length} employees</span>
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
      {/* Employee Performance */}
      <h2 className="text-lg font-semibold text-slate-900 mt-10 mb-4">Employee Performance</h2>
      {empPerformance.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          No employee data yet.
        </div>
      ) : (
        <div className="space-y-6">
          {empPerformance.map((emp) => {
            const completedTasks = emp.tasks.filter((t) => t.status === "completed");
            const onTime = completedTasks.filter((t) => t.dueHour && t.actualSeconds <= t.dueHour * 3600).length;
            const overTime = completedTasks.filter((t) => t.dueHour && t.actualSeconds > t.dueHour * 3600).length;

            return (
              <div key={emp.name} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.tasks.length} tasks assigned</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {onTime > 0 && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">✓ {onTime} on time</span>}
                    {overTime > 0 && <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">↑ {overTime} over time</span>}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 border-b border-slate-100">
                        <th className="text-left pb-2 font-medium">Task</th>
                        <th className="text-left pb-2 font-medium">Status</th>
                        <th className="text-right pb-2 font-medium">Est. Hours</th>
                        <th className="text-right pb-2 font-medium">Time Taken</th>
                        <th className="text-right pb-2 font-medium">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {emp.tasks.map((t) => {
                        const estSecs = t.dueHour ? t.dueHour * 3600 : null;
                        const isCompleted = t.status === "completed";
                        let perfLabel = "";
                        let perfClass = "";
                        if (isCompleted && estSecs) {
                          if (t.actualSeconds <= estSecs) {
                            perfLabel = "On Time";
                            perfClass = "bg-green-100 text-green-700";
                          } else {
                            const overBy = formatSecs(t.actualSeconds - estSecs);
                            perfLabel = `+${overBy} over`;
                            perfClass = "bg-red-100 text-red-700";
                          }
                        } else if (!isCompleted && estSecs && t.actualSeconds > 0) {
                          const pct = Math.min(Math.round((t.actualSeconds / estSecs) * 100), 999);
                          perfLabel = `${pct}% used`;
                          perfClass = pct >= 100 ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700";
                        }

                        return (
                          <tr key={t.taskId} className="py-2">
                            <td className="py-2 text-slate-700 font-medium">{t.title}</td>
                            <td className="py-2"><Badge variant={t.status as "todo" | "in_progress" | "review" | "completed" | "on_hold"} /></td>
                            <td className="py-2 text-right text-slate-500">{t.dueHour ? `${t.dueHour}h` : "—"}</td>
                            <td className="py-2 text-right text-slate-700 font-medium">{t.actualSeconds > 0 ? formatSecs(t.actualSeconds) : "—"}</td>
                            <td className="py-2 text-right">
                              {perfLabel ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${perfClass}`}>{perfLabel}</span>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
