"use client";

import { useState, useEffect, useRef } from "react";

interface DailyLog {
  _id: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: "active" | "paused" | "completed";
  pausedAt?: string;
  totalPausedSeconds: number;
}

const WORK_DAY_SECS = 8 * 3600;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatHMS(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatTime12(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
}

function calcElapsed(log: DailyLog): number {
  const start = new Date(log.startTime).getTime();
  const paused = log.totalPausedSeconds ?? 0;
  if (log.status === "paused" && log.pausedAt) {
    // Frozen at the moment it was paused
    return Math.floor((new Date(log.pausedAt).getTime() - start) / 1000) - paused;
  }
  return Math.floor((Date.now() - start) / 1000) - paused;
}

export default function DailyTimer() {
  const [log, setLog] = useState<DailyLog | null | undefined>(undefined);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/daily-log/today")
      .then((r) => r.json())
      .then((d) => setLog(d.log));
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (log?.status === "active") {
      const tick = () => setElapsed(calcElapsed(log));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else if (log?.status === "paused") {
      setElapsed(calcElapsed(log));
    }

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [log]);

  const handleStart = async () => {
    setLoading(true);
    const res = await fetch("/api/daily-log/start", { method: "POST" });
    const data = await res.json();
    setLog(data.log);
    setLoading(false);
  };

  const handlePause = async () => {
    setLoading(true);
    const res = await fetch("/api/daily-log/pause", { method: "POST" });
    const data = await res.json();
    setLog(data.log);
    setLoading(false);
  };

  const handleResume = async () => {
    setLoading(true);
    const res = await fetch("/api/daily-log/resume", { method: "POST" });
    const data = await res.json();
    setLog(data.log);
    setLoading(false);
  };

  const handleEnd = async () => {
    setLoading(true);
    const res = await fetch("/api/daily-log/end", { method: "POST" });
    const data = await res.json();
    setLog(data.log);
    setLoading(false);
    setShowEndConfirm(false);
  };

  // Loading skeleton
  if (log === undefined) {
    return <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 animate-pulse h-24" />;
  }

  // Not started
  if (!log) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-800">Start your work day</p>
          <p className="text-sm text-slate-400 mt-0.5">Click to begin your 8-hour work timer</p>
        </div>
        <button
          onClick={handleStart}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start Day"}
        </button>
      </div>
    );
  }

  // Completed
  if (log.status === "completed") {
    const totalSecs = log.endTime
      ? Math.floor((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000) - (log.totalPausedSeconds ?? 0)
      : 0;
    const eff = Math.round((totalSecs / WORK_DAY_SECS) * 100);
    const effColor = eff >= 100 ? "text-green-600" : eff >= 60 ? "text-yellow-600" : "text-red-600";

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">✅</div>
            <div>
              <p className="font-semibold text-slate-800">Work day completed</p>
              <p className="text-sm text-slate-400">
                {formatTime12(log.startTime)} → {log.endTime ? formatTime12(log.endTime) : "—"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-slate-800">{formatHMS(totalSecs)}</p>
            <p className={`text-sm font-semibold ${effColor}`}>{eff}% efficiency</p>
          </div>
        </div>
      </div>
    );
  }

  const isPaused = log.status === "paused";
  const pct = Math.min((elapsed / WORK_DAY_SECS) * 100, 100);
  const isOvertime = elapsed > WORK_DAY_SECS;
  const barColor = isPaused ? "bg-slate-400" : isOvertime ? "bg-red-500" : pct >= 75 ? "bg-yellow-400" : "bg-emerald-500";

  return (
    <div className={`bg-white rounded-xl border p-5 mb-6 ${isPaused ? "border-yellow-200 bg-yellow-50/30" : "border-slate-200"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isPaused ? (
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          )}
          <div>
            <p className="font-semibold text-slate-800">
              {isPaused ? "Day paused" : "Work day in progress"}
            </p>
            <p className="text-sm text-slate-400">
              Started at {formatTime12(log.startTime)}
              {isPaused && log.pausedAt && (
                <span className="ml-2 text-yellow-600">· Paused at {formatTime12(log.pausedAt)}</span>
              )}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className={`text-2xl font-bold font-mono ${isPaused ? "text-yellow-600" : isOvertime ? "text-red-600" : "text-slate-800"}`}>
            {formatHMS(elapsed)}
          </p>
          {isOvertime && !isPaused && (
            <p className="text-xs text-red-500 font-medium">+{formatHMS(elapsed - WORK_DAY_SECS)} overtime</p>
          )}
          {isPaused && (
            <p className="text-xs text-yellow-600 font-medium">Timer paused</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{Math.round(pct)}% of 8h</span>
          <span>
            {isOvertime
              ? "Overtime"
              : `${formatHMS(WORK_DAY_SECS - elapsed)} remaining`}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* End Day Confirmation */}
      {showEndConfirm && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-semibold text-red-700 mb-1">End your work day?</p>
          <p className="text-xs text-red-500 mb-3">This will stop the timer for the rest of the day and cannot be restarted today.</p>
          <div className="flex gap-2">
            <button
              onClick={handleEnd}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Ending..." : "Yes, End Day"}
            </button>
            <button
              onClick={() => setShowEndConfirm(false)}
              disabled={loading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {isPaused ? (
          <button
            onClick={handleResume}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? "Resuming..." : "▶ Resume"}
          </button>
        ) : (
          <button
            onClick={handlePause}
            disabled={loading}
            className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? "Pausing..." : "⏸ Pause"}
          </button>
        )}
        <button
          onClick={() => setShowEndConfirm(true)}
          disabled={loading || showEndConfirm}
          className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          End Day
        </button>
      </div>
    </div>
  );
}
