"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { formatSeconds } from "./Timer";
import { Clock, ArrowRight } from "lucide-react";

interface TimeEntry {
  _id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: "running" | "paused" | "stopped";
}

interface TimeLogProps {
  taskId: string;
  refreshTick?: number;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function TimeLog({ taskId, refreshTick }: TimeLogProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/time-entries?taskId=${taskIdRef.current}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries, refreshTick]);

  const totalLogged = entries
    .filter((e) => e.status !== "running")
    .reduce((sum, e) => sum + (e.duration ?? 0), 0);

  const statusStyle = (status: string) =>
    status === "running"
      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
      : status === "paused"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : "bg-slate-100 text-slate-500";

  return (
    <div className="p-6">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
        Time Entries
      </h3>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-slate-400">No time logged yet</p>
        </div>
      ) : (
        <>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-4 py-2.5 border-b border-slate-200">
              <span>Time Range</span>
              <span className="text-right pr-4">Duration</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-slate-100">
              {entries.map((e) => (
                <div
                  key={e._id}
                  className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="text-sm text-slate-600 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">{formatDate(e.startTime)}</span>
                    <span className="text-slate-300 mx-0.5">·</span>
                    <span>{formatTime(e.startTime)}</span>
                    {e.endTime && (
                      <>
                        <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5 flex-shrink-0" />
                        <span>{formatTime(e.endTime)}</span>
                      </>
                    )}
                  </div>
                  <span className="font-mono text-sm font-semibold text-slate-700 pr-4 tabular-nums">
                    {e.duration != null ? formatSeconds(e.duration) : "—"}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${statusStyle(e.status)}`}>
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {totalLogged > 0 && (
            <div className="mt-3 flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <span className="text-sm font-semibold text-slate-600">Total logged time</span>
              <span className="text-lg font-bold text-emerald-600 font-mono tabular-nums">
                {formatSeconds(totalLogged)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
