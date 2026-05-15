"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface TimerProps {
  taskId: string;
  onAction?: () => void; // notify sibling TimeLog to refresh
}

type TimerStatus = "idle" | "running" | "paused";

export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function Timer({ taskId, onAction }: TimerProps) {
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");
  const [totalCompletedSeconds, setTotalCompletedSeconds] = useState(0);
  const [runningStartTime, setRunningStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;

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

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Live ticker
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
        body: JSON.stringify({ taskId: taskIdRef.current }),
      });
      await fetchStatus();
      onAction?.();
    } finally {
      setActionLoading(false);
    }
  };

  // running → total + live session; paused → total frozen; idle → 0
  let display = 0;
  if (timerStatus === "running") display = totalCompletedSeconds + elapsedSeconds;
  else if (timerStatus === "paused") display = totalCompletedSeconds;

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-6">
        <div className="h-16 bg-slate-100 rounded-xl" />
        <div className="h-10 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col items-center gap-5">
      {/* Clock */}
      <div className="text-center">
        <span
          className={`text-6xl font-mono font-bold tabular-nums tracking-tight ${
            timerStatus === "running"
              ? "text-blue-600"
              : timerStatus === "paused"
              ? "text-yellow-500"
              : "text-slate-300"
          }`}
        >
          {formatSeconds(display)}
        </span>
        <p className="text-xs text-slate-400 mt-2">
          {timerStatus === "running"
            ? "Total time logged"
            : timerStatus === "paused"
            ? "Paused — total logged so far"
            : "Timer stopped"}
        </p>
      </div>

      {/* Status badge */}
      <span
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
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

      {/* Controls */}
      <div className="flex gap-3 w-full max-w-sm">
        {timerStatus === "idle" && (
          <button
            onClick={() => doAction("start")}
            disabled={actionLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            ▶ {totalCompletedSeconds > 0 ? "Restart" : "Start"}
          </button>
        )}
        {timerStatus === "running" && (
          <>
            <button
              onClick={() => doAction("pause")}
              disabled={actionLoading}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              ⏸ Pause
            </button>
            <button
              onClick={() => doAction("stop")}
              disabled={actionLoading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              ▶ Resume
            </button>
            <button
              onClick={() => doAction("stop")}
              disabled={actionLoading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              ⏹ Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
