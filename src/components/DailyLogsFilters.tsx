"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  projectId?: string;
  name?: string;
  email?: string;
  startDate?: string;
  endDate?: string;
}

export default function DailyLogsFilters({
  projectId,
  name: initName = "",
  email: initEmail = "",
  startDate: initStart = "",
  endDate: initEnd = "",
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initName);
  const [email, setEmail] = useState(initEmail);
  const [startDate, setStartDate] = useState(initStart);
  const [endDate, setEndDate] = useState(initEnd);

  const apply = () => {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (name.trim()) params.set("name", name.trim());
    if (email.trim()) params.set("email", email.trim());
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    router.push(`/dashboard/manager/timelogs?${params.toString()}`);
  };

  const clear = () => {
    setName(""); setEmail(""); setStartDate(""); setEndDate("");
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    router.push(`/dashboard/manager/timelogs?${params.toString()}`);
  };

  const hasFilters = name || email || startDate || endDate;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Employee Name</label>
          <input
            type="text"
            placeholder="Search by name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
          <input
            type="text"
            placeholder="Search by email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-3">
        {hasFilters && (
          <button
            onClick={clear}
            className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
        )}
        <button
          onClick={apply}
          className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          Search
        </button>
      </div>
    </div>
  );
}
