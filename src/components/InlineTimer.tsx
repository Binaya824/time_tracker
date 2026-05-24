"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { formatSeconds } from "@/components/Timer";

interface InlineTimerProps {
  taskId: string;
  /** Increment this to force all InlineTimers to re-fetch (e.g. after another task's timer fires) */
  refreshTick?: number;
  /** Called after any timer action so the parent can bump refreshTick */
  onAction?: () => void;
  /** When true, shows only the total logged time — no controls (e.g. task is in review) */
  readOnly?: boolean;
}

type TimerStatus = "idle" | "running" | "paused";

export default function InlineTimer({ taskId, refreshTick, onAction, readOnly = false }: InlineTimerProps) {
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");
  const [totalCompletedSeconds, setTotalCompletedSeconds] = useState(0);
  const [runningStartTime, setRunningStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;

  // Fetch current timer state from server — preserves state across page reloads
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/time-entries/status?taskId=${taskIdRef.current}`);
      const data = await res.json();
      setTimerStatus(data.timerStatus);
      setTotalCompletedSeconds(data.totalCompletedSeconds);
      setRunningStartTime(
        data.timerStatus === "running" && data.runningEntry
          ? new Date(data.runningEntry.startTime)
          : null
      );
    } catch {
      // keep previous state on network error
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + re-fetch when another timer fires (refreshTick changes)
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, refreshTick]);

  // Live tick — only runs when this task's timer is running
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

  const doAction = async (action: "start" | "pause" | "resume" | "stop", e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(true);
    try {
      await fetch(`/api/time-entries/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: taskIdRef.current }),
      });
      await fetchStatus();
      onAction?.(); // notify parent → bumps refreshTick → all other cards re-sync
    } finally {
      setActionLoading(false);
    }
  };

  const display =
    timerStatus === "running"
      ? totalCompletedSeconds + elapsedSeconds
      : timerStatus === "paused"
      ? totalCompletedSeconds
      : 0;

  if (loading) {
    return <div className="h-7 w-40 bg-slate-100 rounded-lg animate-pulse" />;
  }

  // Read-only mode: only show total logged time (no controls)
  if (readOnly) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-bold tabular-nums text-slate-500">
          {formatSeconds(display)}
        </span>
        <span className="text-[11px] text-slate-400">total logged</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Time display */}
      <span
        className={`font-mono text-sm font-bold tabular-nums ${
          timerStatus === "running"
            ? "text-blue-600"
            : timerStatus === "paused"
            ? "text-yellow-600"
            : "text-slate-300"
        }`}
      >
        {formatSeconds(display)}
      </span>

      {/* Status pill */}
      <span
        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          timerStatus === "running"
            ? "bg-blue-100 text-blue-700"
            : timerStatus === "paused"
            ? "bg-yellow-100 text-yellow-700"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {timerStatus === "running"
          ? "● Running"
          : timerStatus === "paused"
          ? "⏸ Paused"
          : "○ Not started"}
      </span>

      {/* Controls */}
      {timerStatus === "idle" && (
        <button
          onClick={(e) => doAction("start", e)}
          disabled={actionLoading}
          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          ▶ Start
        </button>
      )}

      {timerStatus === "running" && (
        <>
          <button
            onClick={(e) => doAction("pause", e)}
            disabled={actionLoading}
            className="px-2.5 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            ⏸ Pause
          </button>
          <button
            onClick={(e) => doAction("stop", e)}
            disabled={actionLoading}
            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            ⏹ Stop
          </button>
        </>
      )}

      {timerStatus === "paused" && (
        <>
          <button
            onClick={(e) => doAction("resume", e)}
            disabled={actionLoading}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            ▶ Resume
          </button>
          <button
            onClick={(e) => doAction("stop", e)}
            disabled={actionLoading}
            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            ⏹ Stop
          </button>
        </>
      )}
    </div>
  );
}
