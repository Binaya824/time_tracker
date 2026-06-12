
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { formatSeconds } from "@/components/Timer";
import { Play, Pause, Square } from "lucide-react";

interface InlineTimerProps {
  taskId: string; refreshTick?: number; onAction?: () => void; readOnly?: boolean;
}
type TimerStatus = "idle" | "running" | "paused";

export default function InlineTimer({ taskId, refreshTick, onAction, readOnly = false }: InlineTimerProps) {
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");
  const [display, setDisplay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;
  const totalCompletedRef = useRef(0);
  const runningStartRef = useRef<Date | null>(null);
  const timerStatusRef = useRef<TimerStatus>("idle");

  const fetchStatus = useCallback(async () => {
    try {
      const data = await (await fetch(`/api/time-entries/status?taskId=${taskIdRef.current}`)).json();
      const startTime = data.timerStatus === "running" && data.runningEntry ? new Date(data.runningEntry.startTime) : null;
      totalCompletedRef.current = data.totalCompletedSeconds;
      runningStartRef.current = startTime;
      timerStatusRef.current = data.timerStatus;
      setTimerStatus(data.timerStatus);
      if (data.timerStatus === "running" && startTime)
        setDisplay(data.totalCompletedSeconds + Math.floor((Date.now() - startTime.getTime()) / 1000));
      else if (data.timerStatus === "paused") setDisplay(data.totalCompletedSeconds);
      else setDisplay(data.totalCompletedSeconds);

    } catch { /* keep previous */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus, refreshTick]);
  useEffect(() => {
    const h = () => { if (document.visibilityState === "visible") fetchStatus(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [fetchStatus]);
  useEffect(() => {
    if (timerStatus !== "running") return;
    const tick = () => {
      const start = runningStartRef.current;
      if (!start) return;
      setDisplay(totalCompletedRef.current + Math.floor((Date.now() - start.getTime()) / 1000));
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [timerStatus]);

  const doAction = async (action: "start" | "pause" | "resume" | "stop", e: React.MouseEvent) => {
    e.stopPropagation(); setActionError(""); setActionLoading(true);
    try {
      const res = await fetch(`/api/time-entries/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: taskIdRef.current }),
      });
      if (!res.ok) { const d = await res.json(); setActionError(d.error ?? "Action failed"); return; }
      await fetchStatus(); onAction?.();
    } catch { setActionError("Network error"); await fetchStatus(); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div className="h-7 w-44 rounded-lg skeleton" />;

  if (readOnly) return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-bold tabular-nums text-slate-500">{formatSeconds(display)}</span>
      <span className="text-[11px] text-slate-400">total logged</span>
    </div>
  );

  const timeColor = timerStatus === "running" ? "text-blue-600" : timerStatus === "paused" ? "text-amber-500" : "text-slate-300";
  const pillCls = timerStatus === "running"
    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
    : timerStatus === "paused" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : "bg-slate-100 text-slate-400";
  const pillLabel = timerStatus === "running" ? "Running" : timerStatus === "paused" ? "Paused" : "Not started";

  const btnBase = "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl transition-all duration-200 disabled:opacity-50 cursor-pointer active:scale-90";

  return (
    <div className="flex flex-col gap-1.5">
      {actionError && <p className="text-[11px] text-red-500 font-semibold">{actionError}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-mono text-sm font-black tabular-nums ${timeColor}`}>{formatSeconds(display)}</span>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${pillCls}`}>{pillLabel}</span>

        {timerStatus === "idle" && (
          <button onClick={e => doAction("start", e)} disabled={actionLoading}
            className={`${btnBase} bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm hover:shadow-md hover:shadow-blue-500/25`}>
            <Play className="w-3 h-3" fill="currentColor" /> Start
          </button>
        )}
        {timerStatus === "running" && (
          <>
            <button onClick={e => doAction("pause", e)} disabled={actionLoading}
              className={`${btnBase} bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-amber-900 shadow-sm hover:shadow-md hover:shadow-amber-400/30`}>
              <Pause className="w-3 h-3" fill="currentColor" /> Pause
            </button>
            <button onClick={e => doAction("stop", e)} disabled={actionLoading}
              className={`${btnBase} bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 text-white shadow-sm hover:shadow-md hover:shadow-red-500/30`}>
              <Square className="w-3 h-3" fill="currentColor" /> Stop
            </button>
          </>
        )}
        {timerStatus === "paused" && (
          <>
            <button onClick={e => doAction("resume", e)} disabled={actionLoading}
              className={`${btnBase} bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm hover:shadow-md hover:shadow-blue-500/25`}>
              <Play className="w-3 h-3" fill="currentColor" /> Resume
            </button>
            <button onClick={e => doAction("stop", e)} disabled={actionLoading}
              className={`${btnBase} bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 text-white shadow-sm hover:shadow-md hover:shadow-red-500/30`}>
              <Square className="w-3 h-3" fill="currentColor" /> Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
