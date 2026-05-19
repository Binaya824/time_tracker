import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import TimeEntry from "@/lib/models/TimeEntry";
import DailyLog from "@/lib/models/DailyLog";
import Link from "next/link";
import DailyLogsFilters from "@/components/DailyLogsFilters";

const WORK_DAY_SECS = 8 * 3600;
const PAGE_SIZE = 5;

function formatSecs(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

function pageUrl(base: URLSearchParams, page: number) {
  const p = new URLSearchParams(base);
  p.set("page", String(page));
  return `/dashboard/manager/timelogs?${p.toString()}`;
}

export default async function DailyLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    projectId?: string;
    name?: string;
    email?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "manager") redirect("/login");

  await connectDB();

  const { projectId, name: nameFilter = "", email: emailFilter = "", startDate, endDate, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1"));

  const projects = await Project.find({ managers: authUser.userId });
  const selectedProject = projectId ? projects.find((p) => p._id.toString() === projectId) : null;
  const filteredProjects = selectedProject ? [selectedProject] : projects;
  const projectIds = filteredProjects.map((p) => p._id);

  // Date range
  const defaultSince = new Date();
  defaultSince.setDate(defaultSince.getDate() - 30);
  defaultSince.setHours(0, 0, 0, 0);
  const sinceDate = startDate ?? defaultSince.toISOString().slice(0, 10);
  const sinceDateTime = new Date(sinceDate + "T00:00:00");
  const untilDateTime = endDate ? new Date(endDate + "T23:59:59") : null;

  const taskIds = await Task.find({ project: { $in: projectIds } }, "_id").then((docs) => docs.map((d) => d._id));

  // Time entries
  const teFilter: Record<string, unknown> = { task: { $in: taskIds }, startTime: { $gte: sinceDateTime } };
  if (untilDateTime) (teFilter.startTime as Record<string, Date>).$lte = untilDateTime;
  const entries = await TimeEntry.find(teFilter).populate("user", "name email").sort({ startTime: 1 });

  // Employees in manager's projects
  const allProjects = await Project.find({ managers: authUser.userId }).populate("employees", "name email");
  type PopUser = { _id: { toString(): string }; name: string; email: string };
  const empSet = new Map<string, PopUser>();
  for (const p of allProjects) {
    for (const emp of (p.employees as unknown as PopUser[])) empSet.set(emp._id.toString(), emp);
  }
  const employeeIds = [...empSet.keys()];

  // Daily logs
  const dlFilter: Record<string, unknown> = { user: { $in: employeeIds }, date: { $gte: sinceDate } };
  if (endDate) (dlFilter.date as Record<string, string>).$lte = endDate;
  const dailyLogDocs = await DailyLog.find(dlFilter);

  const dlMap: Record<string, { startTime: Date; endTime: Date | null; totalPausedSeconds: number }> = {};
  for (const dl of dailyLogDocs) {
    dlMap[`${dl.user.toString()}-${dl.date}`] = { startTime: dl.startTime, endTime: dl.endTime ?? null, totalPausedSeconds: dl.totalPausedSeconds };
  }

  // Group by date → employee
  type EmpLog = { name: string; email: string; totalSeconds: number; startTime: Date | null; endTime: Date | null; totalPausedSeconds: number };
  type DateLog = { date: string; employees: Record<string, EmpLog> };
  const dateMap: Record<string, DateLog> = {};

  for (const e of entries) {
    const u = e.user as unknown as PopUser;
    const uid = u._id.toString();
    const dateKey = e.startTime.toISOString().slice(0, 10);
    const dur = e.duration ?? 0;
    const dl = dlMap[`${uid}-${dateKey}`];

    if (!dateMap[dateKey]) dateMap[dateKey] = { date: dateKey, employees: {} };
    if (!dateMap[dateKey].employees[uid]) {
      dateMap[dateKey].employees[uid] = { name: u.name, email: u.email, totalSeconds: 0, startTime: dl?.startTime ?? null, endTime: dl?.endTime ?? null, totalPausedSeconds: dl?.totalPausedSeconds ?? 0 };
    }
    dateMap[dateKey].employees[uid].totalSeconds += dur;
  }

  // Include daily-log-only employees
  for (const dl of dailyLogDocs) {
    const uid = dl.user.toString();
    const emp = empSet.get(uid);
    if (!emp) continue;
    if (!dateMap[dl.date]) dateMap[dl.date] = { date: dl.date, employees: {} };
    if (!dateMap[dl.date].employees[uid]) {
      dateMap[dl.date].employees[uid] = { name: emp.name, email: emp.email, totalSeconds: 0, startTime: dl.startTime, endTime: dl.endTime ?? null, totalPausedSeconds: dl.totalPausedSeconds };
    } else {
      dateMap[dl.date].employees[uid].startTime = dl.startTime;
      dateMap[dl.date].employees[uid].endTime = dl.endTime ?? null;
      dateMap[dl.date].employees[uid].totalPausedSeconds = dl.totalPausedSeconds;
    }
  }

  // Apply name/email filter per day
  const nameQ = nameFilter.toLowerCase();
  const emailQ = emailFilter.toLowerCase();
  let allLogs = Object.values(dateMap)
    .map((day) => {
      const filtered = Object.fromEntries(
        Object.entries(day.employees).filter(([, emp]) => {
          const nMatch = !nameQ || emp.name.toLowerCase().includes(nameQ);
          const eMatch = !emailQ || emp.email.toLowerCase().includes(emailQ);
          return nMatch && eMatch;
        })
      );
      return { ...day, employees: filtered };
    })
    .filter((day) => Object.keys(day.employees).length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Pagination
  const totalDates = allLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalDates / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedLogs = allLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Build base params for pagination links (without page)
  const baseParams = new URLSearchParams();
  if (projectId) baseParams.set("projectId", projectId);
  if (nameFilter) baseParams.set("name", nameFilter);
  if (emailFilter) baseParams.set("email", emailFilter);
  if (startDate) baseParams.set("startDate", startDate);
  if (endDate) baseParams.set("endDate", endDate);

  // Page numbers to show
  const pageNums: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) pageNums.push(i);
    else if (pageNums[pageNums.length - 1] !== "...") pageNums.push("...");
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Daily Logs</h1>
        <p className="text-slate-500 mt-1">
          {startDate || endDate
            ? `${startDate ?? "—"} to ${endDate ?? "today"}`
            : "Last 30 days"}
          {totalDates > 0 && <span className="ml-2 text-slate-400">· {totalDates} date{totalDates !== 1 ? "s" : ""}</span>}
        </p>
      </div>

      {/* Project filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/dashboard/manager/timelogs"
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!projectId ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          All Projects
        </Link>
        {projects.map((p) => (
          <Link
            key={p._id.toString()}
            href={`/dashboard/manager/timelogs?projectId=${p._id}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${projectId === p._id.toString() ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {p.name}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <DailyLogsFilters
        projectId={projectId}
        name={nameFilter}
        email={emailFilter}
        startDate={startDate}
        endDate={endDate}
      />

      {pagedLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          No logs found for the selected filters.
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {pagedLogs.map((day) => {
              const empList = Object.values(day.employees);
              return (
                <div key={day.date} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Date header */}
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                    <span className="font-semibold text-slate-800">{formatDate(day.date)}</span>
                    <span className="text-sm text-slate-500">
                      {empList.length} employee{empList.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Employee table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-white">
                          <th className="text-left px-5 py-2.5 font-medium">Employee</th>
                          <th className="text-left px-5 py-2.5 font-medium">Email</th>
                          <th className="text-center px-5 py-2.5 font-medium">Start Time</th>
                          <th className="text-center px-5 py-2.5 font-medium">End Time</th>
                          <th className="text-center px-5 py-2.5 font-medium">Time Worked</th>
                          <th className="text-center px-5 py-2.5 font-medium">Efficiency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {empList.map((emp) => {
                          // Efficiency = (endTime - startTime - pausedSecs) / 8h
                          const activeSecs = emp.startTime && emp.endTime
                            ? Math.max(0, (emp.endTime.getTime() - emp.startTime.getTime()) / 1000 - emp.totalPausedSeconds)
                            : null;
                          const efficiency = activeSecs !== null ? Math.round((activeSecs / WORK_DAY_SECS) * 100) : null;
                          const effColor = efficiency === null ? "bg-slate-100 text-slate-500" : efficiency >= 100 ? "bg-green-100 text-green-700" : efficiency >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
                          return (
                            <tr key={emp.email} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {emp.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-slate-900">{emp.name}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-slate-500">{emp.email}</td>
                              <td className="px-5 py-3 text-center font-medium text-slate-700">
                                {emp.startTime ? formatTime(emp.startTime) : <span className="text-slate-400">—</span>}
                              </td>
                              <td className="px-5 py-3 text-center font-medium text-slate-700">
                                {emp.endTime ? formatTime(emp.endTime) : <span className="text-slate-400">—</span>}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className="font-semibold text-slate-800">{formatSecs(emp.totalSeconds)}</span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${effColor}`}>
                                  {efficiency !== null ? `${efficiency}%` : "—"}
                                </span>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalDates)} of {totalDates} date{totalDates !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <Link
                  href={pageUrl(baseParams, currentPage - 1)}
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
                      href={pageUrl(baseParams, n as number)}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg font-medium transition-colors ${n === currentPage ? "bg-emerald-600 text-white" : "border border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                    >
                      {n}
                    </Link>
                  )
                )}
                <Link
                  href={pageUrl(baseParams, currentPage + 1)}
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
