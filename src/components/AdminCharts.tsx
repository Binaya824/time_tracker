"use client";

import { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Search, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";

/* ── Types ───────────────────────────────────────────────── */
export type StatusDatum = { name: string; value: number; color: string };
export type TrendDatum  = { date: string; hours: number; logs: number };
export type EmpDatum    = {
  name: string;
  logged: number;      // total hours logged (float)
  onTime: number;      // completed tasks on time
  overTime: number;    // completed tasks over time
  pending: number;     // in-progress / todo tasks
};

interface Props {
  statusData: StatusDatum[];
  trendData:  TrendDatum[];
  empData:    EmpDatum[];
}

type SortKey = "name" | "logged" | "onTime" | "overTime" | "pending" | "efficiency";

/* ── Tooltip helpers ─────────────────────────────────────── */
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-slate-800">{payload[0].name}</p>
      <p className="text-slate-500">{payload[0].value} task{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
};
const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-indigo-600 font-medium">{payload[0]?.value ?? 0} hrs worked</p>
      <p className="text-slate-400">{payload[1]?.value ?? 0} employee{(payload[1]?.value ?? 0) !== 1 ? "s" : ""} logged in</p>
    </div>
  );
};
const renderLegend = (props: any) => (
  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
    {props?.payload?.map((e: any) => (
      <span key={e.value} className="flex items-center gap-1.5 text-xs text-slate-600">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
        {e.value}
      </span>
    ))}
  </div>
);

/* ── Inline progress bar ─────────────────────────────────── */
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-600 font-medium tabular-nums w-8 text-right">{value}</span>
    </div>
  );
}

/* ── Sort header button ──────────────────────────────────── */
function SortTh({ label, col, sortKey, sortDir, onSort }: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th className="px-4 py-3 text-left">
      <button onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-widest
          hover:text-slate-700 transition-colors cursor-pointer group">
        {label}
        <span className="text-slate-300 group-hover:text-slate-500">
          {active
            ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
            : <ChevronsUpDown className="w-3 h-3" />}
        </span>
      </button>
    </th>
  );
}

const PAGE_SIZE = 10;

/* ── Main component ──────────────────────────────────────── */
export default function AdminCharts({ statusData, trendData, empData }: Props) {
  const [mounted,  setMounted]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [sortKey,  setSortKey]  = useState<SortKey>("logged");
  const [sortDir,  setSortDir]  = useState<"asc" | "desc">("desc");

  useEffect(() => setMounted(true), []);

  /* ── Derived data for performance table ── */
  const maxLogged = useMemo(() => Math.max(...empData.map(e => e.logged), 1), [empData]);

  const enriched = useMemo(() =>
    empData.map(e => {
      const completedWithEst = e.onTime + e.overTime;
      const efficiency = completedWithEst > 0 ? Math.round((e.onTime / completedWithEst) * 100) : null;
      return { ...e, efficiency };
    }),
  [empData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? enriched.filter(e => e.name.toLowerCase().includes(q)) : enriched;
  }, [enriched, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "name") {
        return sortDir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortKey === "efficiency") {
        av = a.efficiency ?? -1;
        bv = b.efficiency ?? -1;
      } else {
        av = a[sortKey] as number;
        bv = b[sortKey] as number;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  /* ── Skeleton ── */
  if (!mounted) return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 h-72 skeleton" />
        <div className="bg-white border border-slate-200 rounded-xl p-5 h-72 skeleton" />
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 h-80 skeleton" />
    </div>
  );

  const totalTasks     = statusData.reduce((s, d) => s + d.value, 0);
  const completedCount = statusData.find(d => d.name === "Completed")?.value ?? 0;
  const completionRate = totalTasks ? Math.round((completedCount / totalTasks) * 100) : 0;
  const totalHrs       = trendData.reduce((s, d) => s + d.hours, 0);

  return (
    <div className="space-y-4 mb-6 animate-fade-in-up delay-150">

      {/* ── Row 1: Donut + Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Task Status Donut */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Task Status</h3>
              <p className="text-xs text-slate-400 mt-0.5">Distribution across all projects</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900 tabular-nums">{completionRate}%</p>
              <p className="text-[11px] text-emerald-600 font-semibold">completion rate</p>
            </div>
          </div>
          {totalTasks === 0 ? (
            <div className="flex items-center justify-center h-52 text-slate-300 text-sm">No task data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%"
                  innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                  {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend content={renderLegend} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Daily Trend Area */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Daily Work Hours</h3>
              <p className="text-xs text-slate-400 mt-0.5">Team total — last 14 days</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900 tabular-nums">{totalHrs.toFixed(0)}h</p>
              <p className="text-[11px] text-indigo-600 font-semibold">total logged</p>
            </div>
          </div>
          {trendData.every(d => d.hours === 0) ? (
            <div className="flex items-center justify-center h-52 text-slate-300 text-sm">No daily log data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="logsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<AreaTooltip />} />
                <Area type="monotone" dataKey="hours" name="Hours" stroke="#6366f1" strokeWidth={2}
                  fill="url(#hoursGrad)" dot={{ fill: "#6366f1", strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="logs" name="Employees" stroke="#10b981" strokeWidth={1.5}
                  fill="url(#logsGrad)" dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Employee Performance Table ── */}
      {empData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

          {/* Table header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900">Employee Performance</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {filtered.length} of {empData.length} employees
                {search && ` matching "${search}"`}
              </p>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search employee..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                  hover:border-slate-300 transition-all duration-150"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {pageRows.length === 0 ? (
              <div className="py-14 text-center text-slate-300 text-sm">No employees match your search</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest w-8">#</th>
                    <SortTh label="Employee"  col="name"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Hrs Logged" col="logged"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="On Time"   col="onTime"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Over Time" col="overTime"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Pending"   col="pending"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Efficiency" col="efficiency" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.map((emp, idx) => {
                    const rank = (currentPage - 1) * PAGE_SIZE + idx + 1;
                    const eff = emp.efficiency;
                    const effColor = eff === null ? "text-slate-400"
                      : eff >= 80 ? "text-emerald-600" : eff >= 50 ? "text-amber-600" : "text-red-500";
                    const effBg = eff === null ? "bg-slate-100 text-slate-400"
                      : eff >= 80 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : eff >= 50 ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      : "bg-red-50 text-red-600 ring-1 ring-red-200";

                    return (
                      <tr key={emp.name} className="hover:bg-slate-50/60 transition-colors duration-100 animate-fade-in-up"
                        style={{ animationDelay: `${idx * 30}ms` }}>

                        {/* Rank */}
                        <td className="px-4 py-3.5 text-xs font-bold text-slate-400 tabular-nums">{rank}</td>

                        {/* Name + avatar */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500
                              flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{emp.name}</span>
                          </div>
                        </td>

                        {/* Hours logged with bar */}
                        <td className="px-4 py-3.5 min-w-[120px]">
                          <MiniBar value={emp.logged} max={maxLogged} color="#6366f1" />
                        </td>

                        {/* On Time */}
                        <td className="px-4 py-3.5">
                          {emp.onTime > 0
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{emp.onTime}
                              </span>
                            : <span className="text-slate-300 text-sm">—</span>}
                        </td>

                        {/* Over Time */}
                        <td className="px-4 py-3.5">
                          {emp.overTime > 0
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-600 ring-1 ring-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{emp.overTime}
                              </span>
                            : <span className="text-slate-300 text-sm">—</span>}
                        </td>

                        {/* Pending */}
                        <td className="px-4 py-3.5">
                          {emp.pending > 0
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">{emp.pending}</span>
                            : <span className="text-slate-300 text-sm">—</span>}
                        </td>

                        {/* Efficiency */}
                        <td className="px-4 py-3.5">
                          {eff === null
                            ? <span className="text-[11px] text-slate-400">No data</span>
                            : <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold ${effBg}`}>
                                {eff}%
                              </span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400
                    hover:bg-white hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-150 cursor-pointer active:scale-95">
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p); return acc;
                  }, [])
                  .map((item, i) =>
                    item === "..." ? (
                      <span key={`e-${i}`} className="w-8 text-center text-slate-400 text-sm">…</span>
                    ) : (
                      <button key={item} onClick={() => setPage(item as number)}
                        className={`w-8 h-8 text-xs rounded-lg font-semibold transition-all duration-150 cursor-pointer active:scale-95
                          ${currentPage === item
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "border border-slate-200 text-slate-600 hover:bg-white"}`}>
                        {item}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400
                    hover:bg-white hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-150 cursor-pointer active:scale-95">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
