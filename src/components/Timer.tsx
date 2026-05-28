"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Play, Pause, Square } from "lucide-react";

interface TimerProps {
  taskId: string;
  onAction?: () => void;
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

  const clockColor =
    timerStatus === "running" ? "text-blue-600"
    : timerStatus === "paused" ? "text-amber-500"
    : "text-slate-200";

  const statusPill =
    timerStatus === "running" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
    : timerStatus === "paused" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    : "bg-slate-100 text-slate-400";

  const statusLabel =
    timerStatus === "running" ? "Running"
    : timerStatus === "paused" ? "Paused"
    : "Not started";

  return (
    <div className="p-6 flex flex-col items-center gap-5">
      <div className="text-center">
        <span className={`text-6xl font-mono font-bold tabular-nums tracking-tight ${clockColor}`}>
          {formatSeconds(display)}
        </span>
        <p className="text-xs text-slate-400 mt-2">
          {timerStatus === "running" ? "Total time logged"
          : timerStatus === "paused" ? "Paused — total logged so far"
          : "Timer stopped"}
        </p>
      </div>

      <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${statusPill}`}>
        {statusLabel}
      </span>

      <div className="flex gap-3 w-full max-w-sm">
        {timerStatus === "idle" && (
          <button
            onClick={() => doAction("start")}
            disabled={actionLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-4 h-4" fill="currentColor" />
            {totalCompletedSeconds > 0 ? "Restart" : "Start"}
          </button>
        )}
        {timerStatus === "running" && (
          <>
            <button
              onClick={() => doAction("pause")}
              disabled={actionLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Pause className="w-4 h-4" fill="currentColor" />
              Pause
            </button>
            <button
              onClick={() => doAction("stop")}
              disabled={actionLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Square className="w-4 h-4" fill="currentColor" />
              Stop
            </button>
          </>
        )}
        {timerStatus === "paused" && (
          <>
            <button
              onClick={() => doAction("resume")}
              disabled={actionLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4" fill="currentColor" />
              Resume
            </button>
            <button
              onClick={() => doAction("stop")}
              disabled={actionLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Square className="w-4 h-4" fill="currentColor" />
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
