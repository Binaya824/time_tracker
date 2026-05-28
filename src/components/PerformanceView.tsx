import Badge from "@/components/Badge";
import Link from "next/link";

// ─── Shared types ─────────────────────────────────────────────────────────────
export type EmpTask = {
  taskId: string;
  title: string;
  status: string;
  dueHour?: number;
  actualSeconds: number;
};

export type Employee = {
  name: string;
  tasks: EmpTask[];
};

export type ProjSummary = {
  id: string;
  name: string;
  status: string;
  employeeCount: number;
  scoredTasks: number;
  teamScore: number | null;
};

export type ProjectDetail = {
  id: string;
  name: string;
  status: string;
  employees: Employee[];
};

type ListProps = {
  mode: "list";
  basePath: string;
  accentColor: "indigo" | "emerald";
  summaries: ProjSummary[];
  total: number;
  currentPage: number;
  totalPages: number;
  pageNums: (number | "...")[];
  searchRaw?: string;
  pidParam?: string;
};

type DetailProps = {
  mode: "detail";
  basePath: string;
  accentColor: "indigo" | "emerald";
  project: ProjectDetail;
};

type Props = ListProps | DetailProps;

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function formatSecs(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function calcTaskScore(estSecs: number, actualSecs: number): number | null {
  if (estSecs <= 0 || actualSecs <= 0) return null;
  return Math.min(Math.round((estSecs / actualSecs) * 100), 150);
}

export function scoreColor(score: number): string {
  if (score >= 100) return "bg-green-100 text-green-700";
  if (score >= 75) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export function scoreBarColor(score: number): string {
  if (score >= 100) return "bg-green-500";
  if (score >= 75) return "bg-yellow-400";
  return "bg-red-400";
}

export function scoreLabel(score: number): string {
  if (score >= 120) return "Excellent";
  if (score >= 100) return "Good";
  if (score >= 75) return "Average";
  return "Poor";
}

export function buildUrl(base: string, params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) p.set(k, v);
  }
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

// ─── Accent helpers ───────────────────────────────────────────────────────────
function accent(color: "indigo" | "emerald") {
  return color === "indigo"
    ? {
      activePill: "bg-indigo-600 text-white",
      btn: "bg-indigo-600 hover:bg-indigo-700",
      ring: "focus:ring-indigo-500",
      avatar: "bg-indigo-100 text-indigo-700",
      linkHover: "hover:text-indigo-700",
      linkColor: "text-indigo-600",
    }
    : {
      activePill: "bg-emerald-600 text-white",
      btn: "bg-emerald-600 hover:bg-emerald-700",
      ring: "focus:ring-emerald-500",
      avatar: "bg-emerald-100 text-emerald-700",
      linkHover: "hover:text-emerald-700",
      linkColor: "text-emerald-600",
    };
}

// ─── Detail view ──────────────────────────────────────────────────────────────
function DetailView({ basePath, accentColor, project }: DetailProps) {
  const ac = accent(accentColor);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <Link
        href={basePath}
        className={`inline-flex items-center gap-1.5 text-sm text-slate-500 ${ac.linkHover} mb-6 transition-colors`}
      >
        ← Back to Projects
      </Link>

      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{project.name}</h1>
        <Badge variant={project.status as "active" | "completed" | "on_hold"} />
      </div>
      <p className="text-slate-500 text-sm mb-6 sm:mb-8 text-center sm:text-left">
        Task-level performance for all employees in this project
      </p>

      {project.employees.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          No employees assigned to tasks in this project.
        </div>
      ) : (
        <div className="space-y-4">
          {project.employees.map((emp) => {
            const completedScores = emp.tasks
              .filter((t) => t.status === "completed" && t.dueHour && t.actualSeconds > 0)
              .map((t) => calcTaskScore(t.dueHour! * 3600, t.actualSeconds))
              .filter((s): s is number => s !== null);

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
                <div className="flex items-center gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-4 border-b border-slate-100">
                  <div className={`w-10 h-10 rounded-full ${ac.avatar} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
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

                {/* Stats grid — 2×2 on mobile, 4-col on sm+ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 border-b border-slate-100">
                  <div className="px-4 sm:px-5 py-3 sm:py-4">
                    <p className="text-xs text-slate-400 mb-1">Estimated Time</p>
                    <p className="text-base sm:text-lg font-bold text-slate-800">
                      {totalEst > 0 ? formatSecs(totalEst) : "—"}
                    </p>
                  </div>
                  <div className="px-4 sm:px-5 py-3 sm:py-4">
                    <p className="text-xs text-slate-400 mb-1">Actual Time</p>
                    <p className="text-base sm:text-lg font-bold text-slate-800">
                      {totalActual > 0 ? formatSecs(totalActual) : "—"}
                    </p>
                  </div>
                  <div className="px-4 sm:px-5 py-3 sm:py-4">
                    <p className="text-xs text-slate-400 mb-1">Overall Score</p>
                    {overallScore !== null ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full ${scoreBarColor(overallScore)}`}
                            style={{ width: `${Math.min(overallScore, 100)}%` }}
                          />
                        </div>
                        <span className="text-base sm:text-lg font-bold text-slate-800">{overallScore}%</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No data</p>
                    )}
                  </div>
                  <div className="px-4 sm:px-5 py-3 sm:py-4">
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

                {/* Task table — scrollable on mobile */}
                <div className="overflow-x-auto px-4 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pt-4">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-xs text-slate-400 border-b border-slate-100">
                        <th className="text-left pb-2 font-medium">Task</th>
                        <th className="text-left pb-2 font-medium">Status</th>
                        <th className="text-right pb-2 font-medium">Est.</th>
                        <th className="text-right pb-2 font-medium">Actual</th>
                        <th className="text-right pb-2 font-medium">Score</th>
                        <th className="text-right pb-2 font-medium">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {emp.tasks.map((t) => {
                        const estSecs = t.dueHour ? t.dueHour * 3600 : null;
                        const isCompleted = t.status === "completed";
                        const score =
                          isCompleted && estSecs && t.actualSeconds > 0
                            ? calcTaskScore(estSecs, t.actualSeconds)
                            : null;

                        return (
                          <tr key={t.taskId}>
                            <td className="py-2.5 text-slate-700 font-medium max-w-[160px] truncate">{t.title}</td>
                            <td className="py-2.5">
                              <Badge variant={t.status as "todo" | "in_progress" | "review" | "completed" | "on_hold"} />
                            </td>
                            <td className="py-2.5 text-right text-slate-500">{t.dueHour ? `${t.dueHour}h` : "—"}</td>
                            <td className="py-2.5 text-right text-slate-700 font-medium">
                              {isCompleted && t.actualSeconds > 0 ? formatSecs(t.actualSeconds) : "—"}
                            </td>
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
                            Overall — {completedScores.length}/{scoreableTasks.length} tasks done
                            {scoreableTasks.length > completedScores.length
                              ? ` (${scoreableTasks.length - completedScores.length} incomplete = 0)`
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

                {/* Mobile task cards — shown only on xs */}
                <div className="sm:hidden px-4 pb-4 space-y-3">
                  {emp.tasks.map((t) => {
                    const estSecs = t.dueHour ? t.dueHour * 3600 : null;
                    const isCompleted = t.status === "completed";
                    const score =
                      isCompleted && estSecs && t.actualSeconds > 0
                        ? calcTaskScore(estSecs, t.actualSeconds)
                        : null;

                    return (
                      <div key={t.taskId} className="bg-slate-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800">{t.title}</p>
                          <Badge variant={t.status as "todo" | "in_progress" | "review" | "completed" | "on_hold"} />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Est: {t.dueHour ? `${t.dueHour}h` : "—"}</span>
                          <span>Actual: {isCompleted && t.actualSeconds > 0 ? formatSecs(t.actualSeconds) : "—"}</span>
                          {score !== null && (
                            <span className={`px-2 py-0.5 rounded-full font-medium ${scoreColor(score)}`}>
                              {score}% · {scoreLabel(score)}
                            </span>
                          )}
                        </div>
                        {score !== null && (
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${scoreBarColor(score)}`}
                              style={{ width: `${Math.min(score, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Score legend */}
      <div className="mt-6 sm:mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 sm:gap-5 text-xs text-slate-600">
        <span className="font-medium text-slate-700 w-full sm:w-auto">Score legend:</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5" />Excellent ≥ 120%</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 mr-1.5" />Good 100–119%</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 mr-1.5" />Average 75–99%</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400 mr-1.5" />Poor &lt; 75%</span>
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 8;

function ListView({ basePath, accentColor, summaries, total, currentPage, totalPages, pageNums, searchRaw, pidParam }: ListProps) {
  const ac = accent(accentColor);

  const baseParams: Record<string, string | undefined> = {
    search: searchRaw || undefined,
    pid: pidParam || undefined,
  };

  const statuses = [
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
  ];

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-5 sm:mb-6 text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Employee Performance</h1>
        <p className="text-slate-500 mt-1 text-sm">
          {total} project{total !== 1 ? "s" : ""}
          {searchRaw && <span> matching &ldquo;{searchRaw}&rdquo;</span>}
          <span className="text-slate-400 text-xs ml-2 hidden sm:inline">
            · Click a project to view employee performance details
          </span>
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4 sm:mb-5">
        <Link
          href={buildUrl(basePath, { search: searchRaw })}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!pidParam ? ac.activePill : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(basePath, { search: searchRaw, pid: s.value })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${pidParam === s.value ? ac.activePill : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Search bar */}
      <form method="get" action={basePath} className="mb-5 sm:mb-6 flex gap-2">
        {pidParam && <input type="hidden" name="pid" value={pidParam} />}
        <input
          type="text"
          name="search"
          defaultValue={searchRaw}
          placeholder="Search project by name..."
          className={`flex-1 sm:max-w-sm px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${ac.ring}`}
        />
        <button type="submit" className={`px-4 py-2 ${ac.btn} text-white text-sm font-medium rounded-lg transition-colors`}>
          Search
        </button>
        {searchRaw && (
          <Link
            href={buildUrl(basePath, { pid: pidParam })}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {summaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">No projects found.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
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
                  {summaries.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="px-5 py-4">
                        <Link
                          href={`${basePath}?project=${proj.id}`}
                          className={`font-medium text-slate-900 ${ac.linkHover} transition-colors`}
                        >
                          {proj.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={proj.status as "active" | "completed" | "on_hold"} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${ac.avatar} text-xs font-bold`}>
                          {proj.employeeCount}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center text-slate-600 font-medium">{proj.scoredTasks}</td>
                      <td className="px-5 py-4 text-right">
                        {proj.teamScore !== null ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${scoreBarColor(proj.teamScore)}`}
                                style={{ width: `${Math.min(proj.teamScore, 100)}%` }}
                              />
                            </div>
                            <span className="font-semibold text-slate-800 text-sm w-10 text-right">{proj.teamScore}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {proj.teamScore !== null ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${scoreColor(proj.teamScore)}`}>
                            {scoreLabel(proj.teamScore)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No data</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`${basePath}?project=${proj.id}`} className={`${ac.linkColor} font-medium text-xs hover:underline`}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile project cards */}
          <div className="sm:hidden space-y-3">
            {summaries.map((proj) => (
              <Link
                key={proj.id}
                href={`${basePath}?project=${proj.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className={`font-semibold text-slate-900 ${ac.linkHover} transition-colors`}>{proj.name}</p>
                  <Badge variant={proj.status as "active" | "completed" | "on_hold"} />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
                  <span>{proj.employeeCount} employee{proj.employeeCount !== 1 ? "s" : ""}</span>
                  <span>{proj.scoredTasks} scored task{proj.scoredTasks !== 1 ? "s" : ""}</span>
                </div>

                {proj.teamScore !== null ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Team Score</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{proj.teamScore}%</span>
                        <span className={`px-2 py-0.5 rounded-full font-medium ${scoreColor(proj.teamScore)}`}>
                          {scoreLabel(proj.teamScore)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${scoreBarColor(proj.teamScore)}`}
                        style={{ width: `${Math.min(proj.teamScore, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No performance data yet</p>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <p className="text-sm text-slate-500 order-2 sm:order-1">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} of {total} project{total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
                <Link
                  href={buildUrl(basePath, { ...baseParams, page: String(currentPage - 1) })}
                  className={`px-3 py-1.5 text-sm border border-slate-200 rounded-lg transition-colors ${currentPage === 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
                >
                  ← Prev
                </Link>
                {pageNums.map((n, i) =>
                  n === "..." ? (
                    <span key={`ellipsis-${i}`} className="w-8 text-center text-slate-400 text-sm">…</span>
                  ) : (
                    <Link
                      key={n}
                      href={buildUrl(basePath, { ...baseParams, page: String(n) })}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg font-medium transition-colors ${n === currentPage ? ac.activePill : "border border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                    >
                      {n}
                    </Link>
                  )
                )}
                <Link
                  href={buildUrl(basePath, { ...baseParams, page: String(currentPage + 1) })}
                  className={`px-3 py-1.5 text-sm border border-slate-200 rounded-lg transition-colors ${currentPage === totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
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

// ─── Main export ──────────────────────────────────────────────────────────────
export default function PerformanceView(props: Props) {
  if (props.mode === "detail") return <DetailView {...props} />;
  return <ListView {...props} />;
}