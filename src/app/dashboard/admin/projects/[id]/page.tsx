import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import TimeEntry from "@/lib/models/TimeEntry";
import Badge from "@/components/Badge";
import Link from "next/link";

const PAGE_SIZE = 10;

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

function buildUrl(base: string, params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) p.set(k, v);
  }
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function AdminProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; search?: string; status?: string; priority?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") redirect("/login");

  await connectDB();
  const { id } = await params;
  const { page: pageParam, search: searchRaw, status: statusParam, priority: priorityParam } = await searchParams;

  const project = await Project.findById(id)
    .populate("managers", "name email")
    .populate("employees", "name email");

  if (!project) redirect("/dashboard/admin/projects");

  // Build Mongoose filter
  const filter: Record<string, unknown> = { project: id };
  if (searchRaw?.trim()) {
    filter.$or = [
      { title: { $regex: searchRaw.trim(), $options: "i" } },
      { description: { $regex: searchRaw.trim(), $options: "i" } },
    ];
  }
  if (statusParam && ["todo", "in_progress", "review", "completed", "on_hold"].includes(statusParam)) {
    filter.status = statusParam;
  }
  if (priorityParam && ["low", "medium", "high"].includes(priorityParam)) {
    filter.priority = priorityParam;
  }

  // Backend pagination
  const totalTasks = await Task.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalTasks / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, parseInt(pageParam ?? "1")), totalPages);

  const tasks = await Task.find(filter)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);

  // Fetch time entries only for the current page's tasks
  const taskIds = tasks.map((t) => t._id);
  const timeEntries = await TimeEntry.find({ task: { $in: taskIds } }).populate("user", "name email");

  const timeByTask: Record<string, Record<string, { name: string; seconds: number }>> = {};
  for (const e of timeEntries) {
    const tid = e.task.toString();
    const u = e.user as unknown as { _id: { toString(): string }; name: string };
    const uid = u._id.toString();
    if (!timeByTask[tid]) timeByTask[tid] = {};
    if (!timeByTask[tid][uid]) timeByTask[tid][uid] = { name: u.name, seconds: 0 };
    timeByTask[tid][uid].seconds += e.duration ?? 0;
  }

  // Pagination numbers
  const pageNums: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) pageNums.push(i);
    else if (pageNums[pageNums.length - 1] !== "...") pageNums.push("...");
  }

  const baseUrl = `/dashboard/admin/projects/${id}`;
  const activeFilters: Record<string, string | undefined> = {
    search: searchRaw || undefined,
    status: statusParam || undefined,
    priority: priorityParam || undefined,
  };
  const hasFilters = Object.values(activeFilters).some(Boolean);

  const totalTasksInProject = await Task.countDocuments({ project: id });

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/admin/projects" className="text-sm text-blue-600 hover:underline">
          ← Back to Projects
        </Link>
      </div>

      {/* Project header */}
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
                <p key={m._id} className="text-sm text-slate-700">
                  {m.name} <span className="text-slate-400">({m.email})</span>
                </p>
              ))}
              {project.managers.length === 0 && <p className="text-sm text-slate-400">None assigned</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Employees ({project.employees.length})
            </p>
            <div className="space-y-1">
              {(project.employees as unknown as { _id: string; name: string }[]).slice(0, 5).map((e) => (
                <p key={e._id} className="text-sm text-slate-700">{e.name}</p>
              ))}
              {project.employees.length > 5 && (
                <p className="text-xs text-slate-400">+{project.employees.length - 5} more</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {hasFilters
              ? `${totalTasks} result${totalTasks !== 1 ? "s" : ""} of ${totalTasksInProject} total`
              : `${totalTasksInProject} task${totalTasksInProject !== 1 ? "s" : ""} total`}
          </p>
        </div>
        {totalPages > 1 && (
          <p className="text-sm text-slate-400">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalTasks)} of {totalTasks}
          </p>
        )}
      </div>

      {/* Search + Filters */}
      <form method="get" action={baseUrl} className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            name="search"
            defaultValue={searchRaw}
            placeholder="Search by title or description..."
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            name="status"
            defaultValue={statusParam ?? ""}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Status</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
          <select
            name="priority"
            defaultValue={priorityParam ?? ""}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
          {hasFilters && (
            <Link
              href={baseUrl}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >
              Clear
            </Link>
          )}
        </div>

        {/* Active filter pills */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400 self-center">Active filters:</span>
            {searchRaw && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                Search: &ldquo;{searchRaw}&rdquo;
                <Link href={buildUrl(baseUrl, { ...activeFilters, search: undefined })} className="hover:text-indigo-900 font-bold">×</Link>
              </span>
            )}
            {statusParam && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                Status: {statusParam.replace("_", " ")}
                <Link href={buildUrl(baseUrl, { ...activeFilters, status: undefined })} className="hover:text-indigo-900 font-bold">×</Link>
              </span>
            )}
            {priorityParam && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                Priority: {priorityParam}
                <Link href={buildUrl(baseUrl, { ...activeFilters, priority: undefined })} className="hover:text-indigo-900 font-bold">×</Link>
              </span>
            )}
          </div>
        )}
      </form>

      {/* Task list */}
      {totalTasks === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-slate-600 font-medium">
            {hasFilters ? "No tasks match your filters" : "No tasks yet"}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {hasFilters ? "Try adjusting your search or filters" : "Managers can create tasks for this project"}
          </p>
          {hasFilters && (
            <Link href={baseUrl} className="inline-block mt-4 text-sm text-indigo-600 hover:underline">
              Clear all filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {tasks.map((t) => {
              const taskTime = timeByTask[t._id.toString()] ?? {};
              const totalSeconds = Object.values(taskTime).reduce((sum, u) => sum + u.seconds, 0);

              return (
                <div key={t._id.toString()} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900">{t.title}</h3>
                      {t.description && (
                        <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
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
                    {t.dueDate && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Due Date</p>
                        <p className="text-slate-700">{new Date(t.dueDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {!!t.dueHour && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Est. Hours</p>
                        <p className="text-slate-700">{t.dueHour} hr</p>
                      </div>
                    )}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Link
                  href={buildUrl(baseUrl, { ...activeFilters, page: String(currentPage - 1) })}
                  className={`px-3 py-1.5 text-sm border border-slate-200 rounded-lg transition-colors ${
                    currentPage === 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"
                  }`}
                >
                  ← Prev
                </Link>

                {pageNums.map((n, i) =>
                  n === "..." ? (
                    <span key={`ellipsis-${i}`} className="w-8 text-center text-slate-400 text-sm">…</span>
                  ) : (
                    <Link
                      key={n}
                      href={buildUrl(baseUrl, { ...activeFilters, page: String(n) })}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg font-medium transition-colors ${
                        n === currentPage
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {n}
                    </Link>
                  )
                )}

                <Link
                  href={buildUrl(baseUrl, { ...activeFilters, page: String(currentPage + 1) })}
                  className={`px-3 py-1.5 text-sm border border-slate-200 rounded-lg transition-colors ${
                    currentPage === totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-50"
                  }`}
                >
                  Next →
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
