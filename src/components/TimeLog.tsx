"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { formatSeconds } from "./Timer";

interface TimeEntry {
  _id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: "running" | "paused" | "stopped";
}

interface TimeLogProps {
  taskId: string;
  /** Increment this to trigger a refresh from outside (e.g. after a timer action) */
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

  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
        Time Entries
      </h3>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-3xl mb-2">⏱</p>
          <p className="text-sm">No time logged yet</p>
        </div>
      ) : (
        <>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] text-xs font-medium text-slate-400 uppercase tracking-wider bg-slate-50 px-4 py-2.5 border-b border-slate-200">
              <span>Time Range</span>
              <span className="text-right pr-4">Duration</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-slate-100">
              {entries.map((e) => (
                <div
                  key={e._id}
                  className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm text-slate-600">
                    <span className="font-medium text-slate-800">{formatDate(e.startTime)}</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span>{formatTime(e.startTime)}</span>
                    {e.endTime && (
                      <>
                        <span className="mx-1.5 text-slate-400">→</span>
                        <span>{formatTime(e.endTime)}</span>
                      </>
                    )}
                  </div>
                  <span className="font-mono text-sm font-semibold text-slate-700 pr-4">
                    {e.duration != null ? formatSeconds(e.duration) : "—"}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      e.status === "running"
                        ? "bg-blue-100 text-blue-600"
                        : e.status === "paused"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          {totalLogged > 0 && (
            <div className="mt-3 flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <span className="text-sm font-semibold text-slate-600">Your total logged time</span>
              <span className="text-lg font-bold text-emerald-600 font-mono">
                {formatSeconds(totalLogged)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
