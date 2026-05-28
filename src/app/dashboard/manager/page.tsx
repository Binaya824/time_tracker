import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import TimeEntry from "@/lib/models/TimeEntry";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import Link from "next/link";
import { FolderKanban, ListChecks, Zap, CheckCircle2, ArrowRight, Users } from "lucide-react";

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
    (acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">

      {/* Page header */}
      <div className="mb-6 sm:mb-8">
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Manager</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1 text-sm">Welcome back, <span className="font-medium text-slate-700">{authUser.name}</span></p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="My Projects" value={projects.length} icon="" Icon={FolderKanban} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Total Tasks" value={tasks.length} icon="" Icon={ListChecks} color="bg-blue-50 text-blue-600" />
        <StatCard label="In Progress" value={tasksByStatus["in_progress"] ?? 0} icon="" Icon={Zap} color="bg-amber-50 text-amber-600" />
        <StatCard label="Completed" value={tasksByStatus["completed"] ?? 0} icon="" Icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
      </div>

      {/* My Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">My Projects</h2>
          <Link href="/dashboard/manager/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-card p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <FolderKanban className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
            </div>
            <p className="text-slate-600 font-medium">No projects yet</p>
            <p className="text-slate-400 text-sm mt-1">You haven&apos;t been assigned to any projects</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => {
              const projectTasks = tasks.filter((t) => t.project.toString() === p._id.toString());
              const completed = projectTasks.filter((t) => t.status === "completed").length;
              const pct = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;

              return (
                <div
                  key={p._id.toString()}
                  className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-card p-5 flex flex-col hover:shadow-card-hover transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <FolderKanban className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
                      </div>
                      <h3 className="font-semibold text-slate-900 truncate">{p.name}</h3>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <Badge variant={p.status as "active" | "completed" | "on_hold"} />
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">{p.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <ListChecks className="w-3.5 h-3.5" />
                      {projectTasks.length} tasks
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {(p.employees as unknown as { name: string }[]).length} members
                    </span>
                  </div>

                  {/* Progress bar */}
                  {projectTasks.length > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-auto">
                    <Link
                      href={`/dashboard/manager/projects/${p._id}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                      Manage Tasks
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Employee Performance */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Employee Performance</h2>
        {empPerformance.length === 0 ? (
          <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-card p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
            </div>
            <p className="text-slate-400 text-sm">No employee data yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {empPerformance.map((emp) => {
              const completedTasks = emp.tasks.filter((t) => t.status === "completed");
              const onTime = completedTasks.filter((t) => t.dueHour && t.actualSeconds <= t.dueHour * 3600).length;
              const overTime = completedTasks.filter((t) => t.dueHour && t.actualSeconds > t.dueHour * 3600).length;

              return (
                <div key={emp.name} className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.tasks.length} tasks assigned</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {onTime > 0 && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 rounded-full font-semibold">
                          {onTime} on time
                        </span>
                      )}
                      {overTime > 0 && (
                        <span className="px-2.5 py-1 bg-red-50 text-red-700 ring-1 ring-red-200 rounded-full font-semibold">
                          {overTime} over
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-100">
                          <th className="text-left pb-2.5 font-semibold">Task</th>
                          <th className="text-left pb-2.5 font-semibold">Status</th>
                          <th className="text-right pb-2.5 font-semibold">Est.</th>
                          <th className="text-right pb-2.5 font-semibold">Actual</th>
                          <th className="text-right pb-2.5 font-semibold">Result</th>
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
                              perfClass = "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
                            } else {
                              const overBy = formatSecs(t.actualSeconds - estSecs);
                              perfLabel = `+${overBy} over`;
                              perfClass = "bg-red-50 text-red-700 ring-1 ring-red-200";
                            }
                          } else if (!isCompleted && estSecs && t.actualSeconds > 0) {
                            const pct = Math.min(Math.round((t.actualSeconds / estSecs) * 100), 999);
                            perfLabel = `${pct}% used`;
                            perfClass = pct >= 100 ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200" : "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
                          }

                          return (
                            <tr key={t.taskId}>
                              <td className="py-2.5 text-slate-700 font-medium">{t.title}</td>
                              <td className="py-2.5"><Badge variant={t.status as "todo" | "in_progress" | "review" | "completed" | "on_hold"} /></td>
                              <td className="py-2.5 text-right text-slate-400 text-xs">{t.dueHour ? `${t.dueHour}h` : "—"}</td>
                              <td className="py-2.5 text-right text-slate-700 font-medium text-xs tabular-nums">{t.actualSeconds > 0 ? formatSecs(t.actualSeconds) : "—"}</td>
                              <td className="py-2.5 text-right">
                                {perfLabel ? (
                                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${perfClass}`}>{perfLabel}</span>
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
    </div>
  );
}
