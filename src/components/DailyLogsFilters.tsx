"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, X, SlidersHorizontal } from "lucide-react";

interface Props {
  projectId?: string; name?: string; email?: string;
  startDate?: string; endDate?: string; basePath?: string;
}

const inputCls = `w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm
  text-slate-900 placeholder:text-slate-400
  focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10
  hover:border-slate-300 transition-all duration-200`;

export default function DailyLogsFilters({
  projectId, name: initName = "", email: initEmail = "",
  startDate: initStart = "", endDate: initEnd = "",
  basePath = "/dashboard/manager/timelogs",
}: Props) {
  const router = useRouter();
  const [name, setName]           = useState(initName);
  const [email, setEmail]         = useState(initEmail);
  const [startDate, setStartDate] = useState(initStart);
  const [endDate, setEndDate]     = useState(initEnd);

  const apply = () => {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (name.trim()) params.set("name", name.trim());
    if (email.trim()) params.set("email", email.trim());
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    router.push(`${basePath}?${params.toString()}`);
  };

  const clear = () => {
    setName(""); setEmail(""); setStartDate(""); setEndDate("");
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    router.push(`${basePath}?${params.toString()}`);
  };

  const hasFilters = name || email || startDate || endDate;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filters</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input type="text" placeholder="Employee name..." value={name}
            onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && apply()}
            className={`${inputCls} pl-9`} />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input type="text" placeholder="Email..." value={email}
            onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && apply()}
            className={`${inputCls} pl-9`} />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className={`${inputCls} pl-9`} />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className={`${inputCls} pl-9`} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-3">
        {hasFilters && (
          <button onClick={clear}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-500
              border border-slate-200 rounded-lg bg-white hover:bg-slate-50
              transition-all duration-150 cursor-pointer active:scale-95">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <button onClick={apply}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white
            bg-gradient-to-r from-indigo-600 to-violet-600
            hover:from-indigo-500 hover:to-violet-500
            hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5
            rounded-lg transition-all duration-150 cursor-pointer active:scale-95 shadow-sm">
          <Search className="w-3.5 h-3.5" /> Search
        </button>
      </div>
    </div>
  );
}
