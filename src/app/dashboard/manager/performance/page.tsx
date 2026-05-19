import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import TimeEntry from "@/lib/models/TimeEntry";
import Badge from "@/components/Badge";
import Link from "next/link";

const PAGE_SIZE = 8;

function formatSecs(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function calcTaskScore(estSecs: number, actualSecs: number): number | null {
  if (estSecs <= 0 || actualSecs <= 0) return null;
  return Math.min(Math.round((estSecs / actualSecs) * 100), 150);
}

function scoreColor(score: number): string {
  if (score >= 100) return "bg-green-100 text-green-700";
  if (score >= 75) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function scoreBarColor(score: number): string {
  if (score >= 100) return "bg-green-500";
  if (score >= 75) return "bg-yellow-400";
  return "bg-red-400";
}

function scoreLabel(score: number): string {
  if (score >= 120) return "Excellent";
  if (score >= 100) return "Good";
  if (score >= 75) return "Average";
  return "Poor";
}

function buildUrl(base: string, params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) p.set(k, v);
  }
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function ManagerPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; page?: string; search?: string; pid?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "manager") redirect("/login");

  await connectDB();

  const { project: projectParam, page: pageParam, search: searchRaw, pid: pidParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1"));
  const searchQ = (searchRaw ?? "").toLowerCase().trim();

  const projects = await Project.find({ managers: authUser.userId });
  const projectIds = projects.map((p) => p._id);
  const tasks = await Task.find({ project: { $in: projectIds } }).populate("assignedTo", "name email");
  const taskIds = tasks.map((t) => t._id);
  const timeEntries = await TimeEntry.find({ task: { $in: taskIds } });

  // empId → taskId → totalSeconds
  const empTaskTime: Record<string, Record<string, number>> = {};
  for (const e of timeEntries) {
    const uid = e.user.toString();
    const tid = e.task.toString();
    if (!empTaskTime[uid]) empTaskTime[uid] = {};
    empTaskTime[uid][tid] = (empTaskTime[uid][tid] ?? 0) + (e.duration ?? 0);
  }

  // ─── PROJECT DETAIL VIEW ────────────────────────────────────────────────────
  if (projectParam) {
    const proj = projects.find((p) => p._id.toString() === projectParam);
    if (!proj) redirect("/dashboard/manager/performance");

    const projectTasks = tasks.filter((t) => t.project.toString() === projectParam);

    type EmpTask = { taskId: string; title: string; status: string; dueHour?: number; actualSeconds: number };
    type EmpPerf = { name: string; tasks: EmpTask[] };
    const empMap: Record<string, EmpPerf> = {};

    for (const t of projectTasks) {
      const assigned = t.assignedTo as unknown as { _id: { toString(): string }; name: string }[];
      for (const u of assigned) {
        const uid = u._id.toString();
        if (!empMap[uid]) empMap[uid] = { name: u.name, tasks: [] };
        empMap[uid].tasks.push({
          taskId: t._id.toString(),
          title: t.title,
          status: t.status,
          dueHour: t.dueHour,
          actualSeconds: empTaskTime[uid]?.[t._id.toString()] ?? 0,
        });
      }
    }

    const employees = Object.values(empMap);

    return (
      <div className="p-8">
        <Link
          href="/dashboard/manager/performance"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 mb-6 transition-colors"
        >
          ← Back to Employees
        </Link>

        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">{proj.name}</h1>
          <Badge variant={proj.status as "active" | "completed" | "on_hold"} />
        </div>
        <p className="text-slate-500 mb-8">Task-level performance for all employees in this project</p>

        {employees.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            No employees assigned to tasks in this project.
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map((emp) => {
              // Per-task score: only completed tasks with estimate + time logged
              const completedScores = emp.tasks
                .filter((t) => t.status === "completed" && t.dueHour && t.actualSeconds > 0)
                .map((t) => calcTaskScore(t.dueHour! * 3600, t.actualSeconds))
                .filter((s): s is number => s !== null);

              // Overall score: every task that has an estimate is included.
              // Completed tasks get their actual score; non-completed tasks score 0,
              // so unfinished work pulls the overall performance down.
              const scoreableTasks = emp.tasks.filter((t) => t.dueHour);
              const allScores = scoreableTasks.map((t) => {
                if (t.status === "completed" && t.actualSeconds > 0) {
                  return calcTaskScore(t.dueHour! * 3600, t.actualSeconds) ?? 0;
                }
                return 0;
              });

              const overallScore =
                allScores.length > 0
                  ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
                  : null;
              const totalActual = emp.tasks.reduce((s, t) => s + t.actualSeconds, 0);
              const totalEst = emp.tasks.reduce((s, t) => s + (t.dueHour ? t.dueHour * 3600 : 0), 0);
              const completedCount = emp.tasks.filter((t) => t.status === "completed").length;

              return (
                <div key={emp.name} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Employee header */}
                  <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{emp.name}</p>
                      <p className="text-xs text-slate-400">
                        {emp.tasks.length} task{emp.tasks.length !== 1 ? "s" : ""} assigned
                        {" · "}
                        {completedCount} completed
                      </p>
                    </div>
                  </div>

                  {/* Overall performance summary */}
                  <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
                    <div className="px-5 py-4">
                      <p className="text-xs text-slate-400 mb-1">Estimated Time</p>
                      <p className="text-lg font-bold text-slate-800">
                        {totalEst > 0 ? formatSecs(totalEst) : "—"}
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-xs text-slate-400 mb-1">Actual Time</p>
                      <p className="text-lg font-bold text-slate-800">
                        {totalActual > 0 ? formatSecs(totalActual) : "—"}
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-xs text-slate-400 mb-1">Overall Score</p>
                      {overallScore !== null ? (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full ${scoreBarColor(overallScore)}`}
                              style={{ width: `${Math.min(overallScore, 100)}%` }}
                            />
                          </div>
                          <span className="text-lg font-bold text-slate-800">{overallScore}%</span>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No data</p>
                      )}
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-xs text-slate-400 mb-1">Performance</p>
                      {overallScore !== null ? (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mt-0.5 ${scoreColor(overallScore)}`}>
                          {scoreLabel(overallScore)}
                        </span>
                      ) : (
                        <p className="text-sm text-slate-400 italic">—</p>
                      )}
                    </div>
                  </div>

                  {/* Tasks table */}
                  <div className="overflow-x-auto px-5 pb-5 pt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-100">
                          <th className="text-left pb-2 font-medium">Task</th>
                          <th className="text-left pb-2 font-medium">Status</th>
                          <th className="text-right pb-2 font-medium">Est. Hours</th>
                          <th className="text-right pb-2 font-medium">Time Taken</th>
                          <th className="text-right pb-2 font-medium">Score</th>
                          <th className="text-right pb-2 font-medium">Performance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {emp.tasks.map((t) => {
                          const estSecs = t.dueHour ? t.dueHour * 3600 : null;
                          const isCompleted = t.status === "completed";
                          const score = isCompleted && estSecs && t.actualSeconds > 0
                            ? calcTaskScore(estSecs, t.actualSeconds)
                            : null;

                          return (
                            <tr key={t.taskId}>
                              <td className="py-2.5 text-slate-700 font-medium">{t.title}</td>
                              <td className="py-2.5">
                                <Badge
                                  variant={t.status as "todo" | "in_progress" | "review" | "completed" | "on_hold"}
                                />
                              </td>
                              <td className="py-2.5 text-right text-slate-500">
                                {t.dueHour ? `${t.dueHour}h` : "—"}
                              </td>
                              {/* Time Taken: only show for completed tasks */}
                              <td className="py-2.5 text-right text-slate-700 font-medium">
                                {isCompleted && t.actualSeconds > 0 ? formatSecs(t.actualSeconds) : "—"}
                              </td>
                              {/* Score: only for completed tasks */}
                              <td className="py-2.5 text-right">
                                {score !== null ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-1.5 rounded-full ${scoreBarColor(score)}`}
                                        style={{ width: `${Math.min(score, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700">{score}%</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>
                              {/* Performance: only for completed tasks */}
                              <td className="py-2.5 text-right">
                                {score !== null ? (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scoreColor(score)}`}>
                                    {scoreLabel(score)}
                                    {score >= 100 && estSecs && t.actualSeconds < estSecs
                                      ? ` · saved ${formatSecs(estSecs - t.actualSeconds)}`
                                      : score < 100 && estSecs
                                      ? ` · +${formatSecs(t.actualSeconds - estSecs)} over`
                                      : ""}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>

                      {allScores.length > 0 && (
                        <tfoot>
                          <tr className="border-t-2 border-slate-200 text-xs text-slate-500 font-medium">
                            <td colSpan={4} className="pt-3 pb-1">
                              Overall Performance — {completedScores.length} of {scoreableTasks.length} task{scoreableTasks.length !== 1 ? "s" : ""} completed
                              {scoreableTasks.length > completedScores.length
                                ? ` (${scoreableTasks.length - completedScores.length} incomplete scored as 0)`
                                : ""}
                            </td>
                            <td className="pt-3 pb-1 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${scoreBarColor(overallScore!)}`}
                                    style={{ width: `${Math.min(overallScore!, 100)}%` }}
                                  />
                                </div>
                                <span className="font-bold text-slate-700">{overallScore}%</span>
                              </div>
                            </td>
                            <td className="pt-3 pb-1 text-right">
                              <span className={`px-2.5 py-1 rounded-full font-semibold ${scoreColor(overallScore!)}`}>
                                {scoreLabel(overallScore!)}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap gap-5 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Score legend:</span>
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5" />
            Excellent ≥ 120%
          </span>
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 mr-1.5" />
            Good 100–119%
          </span>
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 mr-1.5" />
            Average 75–99%
          </span>
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400 mr-1.5" />
            Poor &lt; 75%
          </span>
          <span className="text-slate-400">
            Score = (Estimated ÷ Actual) × 100 &nbsp;·&nbsp; Only completed tasks scored &nbsp;·&nbsp; Project score
            = mean of task scores
          </span>
        </div>
      </div>
    );
  }

  // ─── PROJECT LIST VIEW ───────────────────────────────────────────────────────
  // Compute per-project summary: employee count + avg team performance score
  type ProjSummary = {
    id: string;
    name: string;
    status: string;
    employeeCount: number;
    scoredTasks: number;
    teamScore: number | null;
  };

  const projSummaries: ProjSummary[] = projects.map((proj) => {
    const projId = proj._id.toString();
    const projectTasks = tasks.filter((t) => t.project.toString() === projId);

    const allScores: number[] = [];
    const empSet = new Set<string>();

    for (const t of projectTasks) {
      const assigned = t.assignedTo as unknown as { _id: { toString(): string } }[];
      for (const u of assigned) {
        empSet.add(u._id.toString());
        if (t.status === "completed" && t.dueHour) {
          const uid = u._id.toString();
          const actualSecs = empTaskTime[uid]?.[t._id.toString()] ?? 0;
          const score = calcTaskScore(t.dueHour * 3600, actualSecs);
          if (score !== null) allScores.push(score);
        }
      }
    }

    return {
      id: projId,
      name: proj.name,
      status: proj.status,
      employeeCount: empSet.size,
      scoredTasks: allScores.length,
      teamScore:
        allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : null,
    };
  });

  // Apply filters
  const statusFilter = pidParam; // reuse pidParam as status filter in list view
  let filtered = [...projSummaries];
  if (searchQ) filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchQ));
  if (statusFilter && ["active", "completed", "on_hold"].includes(statusFilter)) {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  // Pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const baseParams: Record<string, string | undefined> = {
    search: searchRaw || undefined,
    pid: pidParam || undefined,
  };

  const pageNums: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) pageNums.push(i);
    else if (pageNums[pageNums.length - 1] !== "...") pageNums.push("...");
  }

  const statuses = [
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Employee Performance</h1>
        <p className="text-slate-500 mt-1">
          {total} project{total !== 1 ? "s" : ""}
          {searchQ && <span> matching &ldquo;{searchRaw}&rdquo;</span>}
          <span className="text-slate-400 text-xs ml-2">
            · Click a project to view employee performance details
          </span>
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Link
          href={buildUrl("/dashboard/manager/performance", { search: searchRaw })}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !pidParam
              ? "bg-emerald-600 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl("/dashboard/manager/performance", { search: searchRaw, pid: s.value })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              pidParam === s.value
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="get" action="/dashboard/manager/performance" className="mb-6 flex gap-2">
        {pidParam && <input type="hidden" name="pid" value={pidParam} />}
        <input
          type="text"
          name="search"
          defaultValue={searchRaw}
          placeholder="Search project by name..."
          className="flex-1 max-w-sm px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Search
        </button>
        {searchRaw && (
          <Link
            href={buildUrl("/dashboard/manager/performance", { pid: pidParam })}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Project list */}
      {paged.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          No projects found.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Project</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-center px-5 py-3 font-medium">Employees</th>
                  <th className="text-center px-5 py-3 font-medium">Scored Tasks</th>
                  <th className="text-right px-5 py-3 font-medium">Team Score</th>
                  <th className="text-right px-5 py-3 font-medium">Performance</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map((proj) => (
                  <tr
                    key={proj.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/manager/performance?project=${proj.id}`}
                        className="font-medium text-slate-900 hover:text-emerald-700 transition-colors"
                      >
                        {proj.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={proj.status as "active" | "completed" | "on_hold"} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        {proj.employeeCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-slate-600 font-medium">
                      {proj.scoredTasks}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {proj.teamScore !== null ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${scoreBarColor(proj.teamScore)}`}
                              style={{ width: `${Math.min(proj.teamScore, 100)}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-800 text-sm w-10 text-right">
                            {proj.teamScore}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {proj.teamScore !== null ? (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${scoreColor(proj.teamScore)}`}
                        >
                          {scoreLabel(proj.teamScore)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No data</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/manager/performance?project=${proj.id}`}
                        className="text-emerald-600 font-medium text-xs hover:underline"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, total)} of {total} project
                {total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <Link
                  href={buildUrl("/dashboard/manager/performance", {
                    ...baseParams,
                    page: String(currentPage - 1),
                  })}
                  className={`px-3 py-1.5 text-sm border border-slate-200 rounded-lg transition-colors ${
                    currentPage === 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"
                  }`}
                >
                  ← Prev
                </Link>
                {pageNums.map((n, i) =>
                  n === "..." ? (
                    <span key={`ellipsis-${i}`} className="w-8 text-center text-slate-400 text-sm">
                      …
                    </span>
                  ) : (
                    <Link
                      key={n}
                      href={buildUrl("/dashboard/manager/performance", {
                        ...baseParams,
                        page: String(n),
                      })}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg font-medium transition-colors ${
                        n === currentPage
                          ? "bg-emerald-600 text-white"
                          : "border border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {n}
                    </Link>
                  )
                )}
                <Link
                  href={buildUrl("/dashboard/manager/performance", {
                    ...baseParams,
                    page: String(currentPage + 1),
                  })}
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
