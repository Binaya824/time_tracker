"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface TimerProps {
  taskId: string;
  taskTitle: string;
}

type TimerStatus = "idle" | "running" | "paused";

interface TimeEntry {
  _id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: "running" | "paused" | "stopped";
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Timer({ taskId, taskTitle }: TimerProps) {
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");
  const [totalCompletedSeconds, setTotalCompletedSeconds] = useState(0);
  const [runningStartTime, setRunningStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Entries state lives here — no parent re-render
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Keep taskId stable in callbacks via ref
  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;

  const fetchEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const res = await fetch(`/api/time-entries?taskId=${taskIdRef.current}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/time-entries/status?taskId=${taskIdRef.current}`);
      const data = await res.json();
      setTimerStatus(data.timerStatus);
      setTotalCompletedSeconds(data.totalCompletedSeconds);
      if (data.timerStatus === "running" && data.runningEntry) {
        setRunningStartTime(new Date(data.runningEntry.startTime));
      } else {
        setRunningStartTime(null);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchEntries();
  }, [fetchStatus, fetchEntries]);

  // Live ticker — only ticks when running
  useEffect(() => {
    if (timerStatus !== "running" || !runningStartTime) {
      setElapsedSeconds(0);
      return;
    }
    const tick = () =>
      setElapsedSeconds(Math.floor((Date.now() - runningStartTime.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerStatus, runningStartTime]);

  const doAction = async (action: "start" | "pause" | "resume" | "stop") => {
    setActionLoading(true);
    try {
      await fetch(`/api/time-entries/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      // fetch status and entries in parallel — no parent involved
      await Promise.all([fetchStatus(), fetchEntries()]);
    } finally {
      setActionLoading(false);
    }
  };

  // Display logic:
  //  running → total completed + live elapsed (growing)
  //  paused  → total completed so far (frozen, NOT reset)
  //  idle    → 0 (reset after stop, or never started)
  let timerDisplay = 0;
  if (timerStatus === "running") {
    timerDisplay = totalCompletedSeconds + elapsedSeconds;
  } else if (timerStatus === "paused") {
    timerDisplay = totalCompletedSeconds;
  }

  const totalLogged = entries.reduce((sum, e) => sum + (e.duration ?? 0), 0);

  if (loading) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-32 mb-3" />
        <div className="h-10 bg-slate-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Timer card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Time Tracker</p>
        <p className="text-sm text-slate-700 font-medium mb-4 truncate">{taskTitle}</p>

        {/* Timer display */}
        <div className="text-center mb-2">
          <span
            className={`text-4xl font-mono font-bold tabular-nums ${
              timerStatus === "running"
                ? "text-blue-600"
                : timerStatus === "paused"
                ? "text-yellow-600"
                : "text-slate-400"
            }`}
          >
            {formatSeconds(timerDisplay)}
          </span>
          <p className="text-xs text-slate-400 mt-1">
            {timerStatus === "running"
              ? "Total time logged"
              : timerStatus === "paused"
              ? "Paused — total logged so far"
              : "Timer stopped"}
          </p>
        </div>

        {/* Status pill */}
        <div className="flex justify-center mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              timerStatus === "running"
                ? "bg-blue-100 text-blue-700"
                : timerStatus === "paused"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {timerStatus === "running"
              ? "● Running"
              : timerStatus === "paused"
              ? "⏸ Paused"
              : "○ Not started"}
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {timerStatus === "idle" && (
            <button
              onClick={() => doAction("start")}
              disabled={actionLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              ▶ {timerDisplay === 0 && totalLogged === 0 ? "Start" : "Restart"}
            </button>
          )}
          {timerStatus === "running" && (
            <>
              <button
                onClick={() => doAction("pause")}
                disabled={actionLoading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                ⏸ Pause
              </button>
              <button
                onClick={() => doAction("stop")}
                disabled={actionLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                ⏹ Stop
              </button>
            </>
          )}
          {timerStatus === "paused" && (
            <>
              <button
                onClick={() => doAction("resume")}
                disabled={actionLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                ▶ Resume
              </button>
              <button
                onClick={() => doAction("stop")}
                disabled={actionLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                ⏹ Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Time log — rendered by Timer, no parent state involved */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700">Time Log</h4>
        </div>

        {entriesLoading ? (
          <div className="p-4 text-center text-xs text-slate-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">No time logged yet</div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
              {entries.map((e) => (
                <div key={e._id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <div className="text-slate-600">
                    <span className="font-medium text-slate-800">{formatDate(e.startTime)}</span>
                    <span className="ml-1.5">{formatTime(e.startTime)}</span>
                    {e.endTime && (
                      <>
                        <span className="mx-1 text-slate-400">→</span>
                        <span>{formatTime(e.endTime)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {e.duration != null && (
                      <span className="font-mono font-semibold text-slate-700">
                        {formatSeconds(e.duration)}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full ${
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
                </div>
              ))}
            </div>

            {/* Total row */}
            {totalLogged > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border-t border-emerald-100">
                <span className="text-xs font-semibold text-slate-600">Your total logged time</span>
                <span className="text-sm font-bold text-emerald-600 font-mono">
                  {formatSeconds(totalLogged)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
