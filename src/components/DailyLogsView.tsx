"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DailyLogsFilters from "@/components/DailyLogsFilters";

const WORK_DAY_SECS = 8 * 3600;

export type DayEmployeeLog = {
  name: string;
  email: string;
  totalSeconds: number;
  startTime: string | null;
  endTime: string | null;
  totalPausedSeconds: number;
  status: string | null;
};

export type DayLog = {
  date: string;
  employees: Record<string, DayEmployeeLog>;
};

type Props = {
  basePath: string;
  accentColor: "indigo" | "emerald";
  projects: { id: string; name: string }[];
  pagedLogs: DayLog[];
  totalDates: number;
  currentPage: number;
  totalPages: number;
  pageNums: (number | "...")[];
  projectId?: string;
  nameFilter: string;
  emailFilter: string;
  startDate?: string;
  endDate?: string;
  baseParamsStr: string;
};

function formatSecs(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

function pageUrl(basePath: string, base: URLSearchParams, page: number) {
  const p = new URLSearchParams(base);
  p.set("page", String(page));
  return `${basePath}?${p.toString()}`;
}

function accent(color: "indigo" | "emerald") {
  return color === "indigo"
    ? { activePill: "bg-indigo-600 text-white", inactivePill: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50" }
    : { activePill: "bg-emerald-600 text-white", inactivePill: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50" };
}

// ← added status dot
function StatusDot({ status }: { status: string | null }) {
  if (status === "active") return <span className="w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />;
  if (status === "completed") return <span className="w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />;
  return null;
}

export default function DailyLogsView({
  basePath,
  accentColor,
  projects,
  pagedLogs,
  totalDates,
  currentPage,
  totalPages,
  pageNums,
  projectId,
  nameFilter,
  emailFilter,
  startDate,
  endDate,
  baseParamsStr,
}: Props) {
  const ac = accent(accentColor);
  const baseParams = new URLSearchParams(baseParamsStr);
  const router = useRouter();

  // ← auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${accentColor === "indigo" ? "text-indigo-600" : "text-emerald-600"}`}>
          {accentColor === "indigo" ? "Admin" : "Manager"}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Daily Logs</h1>
        <p className="text-slate-500 mt-1 text-sm">
          {startDate || endDate ? `${startDate ?? "—"} to ${endDate ?? "today"}` : "Last 30 days"}
          {totalDates > 0 && (
            <span className="ml-2 text-slate-400">· {totalDates} date{totalDates !== 1 ? "s" : ""}</span>
          )}
        </p>
      </div>

      {/* Project filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={basePath}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!projectId ? ac.activePill : ac.inactivePill}`}
        >
          All Projects
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`${basePath}?projectId=${p.id}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${projectId === p.id ? ac.activePill : ac.inactivePill}`}
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
        basePath={basePath}
      />

      {pagedLogs.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-card p-12 text-center text-slate-400">
          No logs found for the selected filters.
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {pagedLogs.map((day) => {
              const empList = Object.values(day.employees);
              return (
                <div key={day.date} className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-card overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                    <span className="font-semibold text-slate-800">{formatDate(day.date)}</span>
                    <span className="text-sm text-slate-500">
                      {empList.length} employee{empList.length !== 1 ? "s" : ""}
                    </span>
                  </div>

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
                          const activeSecs =
                            emp.startTime && emp.endTime
                              ? Math.max(
                                0,
                                (new Date(emp.endTime).getTime() - new Date(emp.startTime).getTime()) / 1000 -
                                emp.totalPausedSeconds
                              )
                              : null;
                          const efficiency =
                            activeSecs !== null ? Math.round((activeSecs / WORK_DAY_SECS) * 100) : null;
                          const effColor =
                            efficiency === null
                              ? "bg-slate-100 text-slate-500"
                              : efficiency >= 100
                                ? "bg-green-100 text-green-700"
                                : efficiency >= 60
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700";

                          return (
                            <tr key={emp.email} className="hover:bg-slate-50 transition-colors">
                              {/* ← updated employee cell */}
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-shrink-0">
                                    <div className={`w-7 h-7 rounded-full ${accentColor === "indigo" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"} flex items-center justify-center text-xs font-bold`}>
                                      {emp.name.charAt(0).toUpperCase()}
                                    </div>
                                    <StatusDot status={emp.status} />
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
                                <span className="font-semibold text-slate-800">
                                  {activeSecs !== null ? formatSecs(activeSecs) : <span className="text-slate-400">—</span>}
                                </span>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * 5 + 1}–{Math.min(currentPage * 5, totalDates)} of {totalDates} date
                {totalDates !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <Link
                  href={pageUrl(basePath, baseParams, currentPage - 1)}
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
                      href={pageUrl(basePath, baseParams, n as number)}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg font-medium transition-colors ${n === currentPage ? ac.activePill : "border border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                    >
                      {n}
                    </Link>
                  )
                )}
                <Link
                  href={pageUrl(basePath, baseParams, currentPage + 1)}
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