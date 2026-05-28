 
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { formatSeconds } from "@/components/Timer";

interface InlineTimerProps {
  taskId: string;
  refreshTick?: number;
  onAction?: () => void;
  readOnly?: boolean;
}

type TimerStatus = "idle" | "running" | "paused";

export default function InlineTimer({ taskId, refreshTick, onAction, readOnly = false }: InlineTimerProps) {
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");
  const [display, setDisplay] = useState(0); //  single source of truth — never split
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(""); //  surface errors to user

  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;

  //  Refs so interval always reads fresh values — no stale closure
  const totalCompletedRef = useRef(0);
  const runningStartRef = useRef<Date | null>(null);
  const timerStatusRef = useRef<TimerStatus>("idle");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/time-entries/status?taskId=${taskIdRef.current}`);
      const data = await res.json();

      const startTime =
        data.timerStatus === "running" && data.runningEntry
          ? new Date(data.runningEntry.startTime)
          : null;

      //  Update refs first — interval reads these, not state
      totalCompletedRef.current = data.totalCompletedSeconds;
      runningStartRef.current = startTime;
      timerStatusRef.current = data.timerStatus;

      //  Update state
      setTimerStatus(data.timerStatus);

      //  Pre-seed display atomically — no flash from 0, no decrement
      if (data.timerStatus === "running" && startTime) {
        setDisplay(
          data.totalCompletedSeconds +
          Math.floor((Date.now() - startTime.getTime()) / 1000)
        );
      } else if (data.timerStatus === "paused") {
        setDisplay(data.totalCompletedSeconds);
      } else {
        setDisplay(0);
      }
    } catch {
      // keep previous state on network error
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + re-fetch when refreshTick changes
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, refreshTick]);

  //  Re-sync when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchStatus]);

  // Interval reads from refs — always fresh, never stale
  useEffect(() => {
    if (timerStatus !== "running") return;

    const tick = () => {
      const start = runningStartRef.current;
      if (!start) return;
      setDisplay(
        totalCompletedRef.current +
        Math.floor((Date.now() - start.getTime()) / 1000)
      );
    };

    tick(); // immediate tick — no 1s delay on start/resume
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerStatus]); //  only depends on status, not runningStartTime object

  const doAction = async (action: "start" | "pause" | "resume" | "stop", e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/time-entries/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: taskIdRef.current }),
      });
      if (!res.ok) {
        // Surface API errors
        const data = await res.json();
        setActionError(data.error ?? "Action failed, please try again");
        return;
      }
      await fetchStatus(); // atomically updates display + refs
      onAction?.();
    } catch {
      // Surface network errors
      setActionError("Network error, please try again");
      await fetchStatus(); // rollback to server truth
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="h-7 w-40 bg-slate-100 rounded-lg animate-pulse" />;
  }

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
    <div className="flex flex-col gap-1">
      {/* Error message */}
      {actionError && (
        <p className="text-[11px] text-red-500 font-medium">{actionError}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {/* Time display */}
        <span className={`font-mono text-sm font-bold tabular-nums ${
          timerStatus === "running" ? "text-blue-600"
          : timerStatus === "paused" ? "text-yellow-600"
          : "text-slate-300"
        }`}>
          {formatSeconds(display)}
        </span>

        {/* Status pill */}
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          timerStatus === "running" ? "bg-blue-100 text-blue-700"
          : timerStatus === "paused" ? "bg-yellow-100 text-yellow-700"
          : "bg-slate-100 text-slate-400"
        }`}>
          {timerStatus === "running" ? "● Running"
            : timerStatus === "paused" ? "⏸ Paused"
            : "○ Not started"}
        </span>

        {/* Controls */}
        {timerStatus === "idle" && (
          <button onClick={(e) => doAction("start", e)} disabled={actionLoading}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
            ▶ Start
          </button>
        )}

        {timerStatus === "running" && (
          <>
            <button onClick={(e) => doAction("pause", e)} disabled={actionLoading}
              className="px-2.5 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
              ⏸ Pause
            </button>
            <button onClick={(e) => doAction("stop", e)} disabled={actionLoading}
              className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
              ⏹ Stop
            </button>
          </>
        )}

        {timerStatus === "paused" && (
          <>
            <button onClick={(e) => doAction("resume", e)} disabled={actionLoading}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
              ▶ Resume
            </button>
            <button onClick={(e) => doAction("stop", e)} disabled={actionLoading}
              className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
              ⏹ Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
