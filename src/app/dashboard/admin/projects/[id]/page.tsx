import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import TimeEntry from "@/lib/models/TimeEntry";
import Badge from "@/components/Badge";
import Link from "next/link";

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") redirect("/login");

  await connectDB();
  const { id } = await params;

  const project = await Project.findById(id)
    .populate("managers", "name email")
    .populate("employees", "name email");

  if (!project) redirect("/dashboard/admin/projects");

  const tasks = await Task.find({ project: id })
    .populate("assignedTo", "name email")
    .populate("createdBy", "name");

  // Get time summaries per task
  const taskIds = tasks.map((t) => t._id);
  const timeEntries = await TimeEntry.find({ task: { $in: taskIds } })
    .populate("user", "name email");

  const timeByTask: Record<string, Record<string, { name: string; seconds: number }>> = {};
  for (const e of timeEntries) {
    const tid = e.task.toString();
    const u = e.user as unknown as { _id: { toString(): string }; name: string; email: string };
    const uid = u._id.toString();
    if (!timeByTask[tid]) timeByTask[tid] = {};
    if (!timeByTask[tid][uid]) timeByTask[tid][uid] = { name: u.name, seconds: 0 };
    timeByTask[tid][uid].seconds += e.duration ?? 0;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/admin/projects" className="text-sm text-blue-600 hover:underline">
          ← Back to Projects
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            {project.description && <p className="text-slate-500 mt-1">{project.description}</p>}
          </div>
          <Badge variant={project.status as "active" | "completed" | "on_hold"} />
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Managers</p>
            <div className="space-y-1">
              {(project.managers as unknown as { _id: string; name: string; email: string }[]).map((m) => (
                <p key={m._id} className="text-sm text-slate-700">{m.name} <span className="text-slate-400">({m.email})</span></p>
              ))}
              {project.managers.length === 0 && <p className="text-sm text-slate-400">None assigned</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Employees ({project.employees.length})</p>
            <div className="space-y-1">
              {(project.employees as unknown as { _id: string; name: string; email: string }[]).slice(0, 5).map((e) => (
                <p key={e._id} className="text-sm text-slate-700">{e.name}</p>
              ))}
              {project.employees.length > 5 && (
                <p className="text-xs text-slate-400">+{project.employees.length - 5} more</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Tasks ({tasks.length})</h2>
      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          No tasks yet. Managers can create tasks for this project.
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((t) => {
            const taskTime = timeByTask[t._id.toString()] ?? {};
            const totalSeconds = Object.values(taskTime).reduce((sum, u) => sum + u.seconds, 0);

            return (
              <div key={t._id.toString()} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-slate-900">{t.title}</h3>
                    {t.description && <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.priority as "low" | "medium" | "high"} />
                    <Badge variant={t.status as "todo" | "in_progress" | "review" | "completed" | "on_hold"} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Assigned to</p>
                    <p className="text-slate-700">
                      {(t.assignedTo as unknown as { name: string }[]).map((u) => u.name).join(", ") || "Unassigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Total time logged</p>
                    <p className="text-slate-700 font-medium">{formatSeconds(totalSeconds)}</p>
                  </div>
                </div>

                {Object.keys(taskTime).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-2">Time by employee</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(taskTime).map((u) => (
                        <span key={u.name} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                          {u.name}: {formatSeconds(u.seconds)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
