
"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, StopCircle, CheckCircle, Clock } from "lucide-react";

interface DailyLog {
  _id: string; date: string; startTime: string; endTime?: string;
  status: "active" | "paused" | "completed"; pausedAt?: string; totalPausedSeconds: number;
}

const WORK_DAY_SECS = 8 * 3600;
function pad(n: number) { return String(n).padStart(2, "0"); }
function formatHMS(s: number) { return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`; }
function formatTime12(iso: string) { return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true }); }
function calcElapsed(log: DailyLog): number {
  const start = new Date(log.startTime).getTime();
  const paused = log.totalPausedSeconds ?? 0;
  if (log.status === "paused" && log.pausedAt)
    return Math.max(0, Math.floor((new Date(log.pausedAt).getTime() - start) / 1000) - paused);
  if (log.status === "active")
    return Math.max(0, Math.floor((Date.now() - start) / 1000) - paused);
  return 0;
}

export default function DailyTimer() {
  const [log, setLog] = useState<DailyLog | null | undefined>(undefined);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<DailyLog | null | undefined>(undefined);

  const applyLog = (newLog: DailyLog | null) => {
    logRef.current = newLog; setLog(newLog);
    if (newLog) setElapsed(calcElapsed(newLog)); else setElapsed(0);
  };

  useEffect(() => {
    fetch("/api/daily-log/today").then(r => r.json()).then(d => applyLog(d.log ?? null));
  }, []);

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (log?.status !== "active") return;
    intervalRef.current = setInterval(() => {
      if (logRef.current?.status === "active") setElapsed(calcElapsed(logRef.current));
    }, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [log?.status]);

  const call = async (url: string) => { setLoading(true); applyLog((await (await fetch(url, { method: "POST" })).json()).log); setLoading(false); };
  const handleStart  = () => call("/api/daily-log/start");
  const handlePause  = () => call("/api/daily-log/pause");
  const handleResume = () => call("/api/daily-log/resume");
  const handleEnd    = async () => { await call("/api/daily-log/end"); setShowEndConfirm(false); };

  if (log === undefined)
    return <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5 skeleton h-28 shadow-sm" />;

  if (!log) return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-5
      flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
        </div>
        <div>
          <p className="font-bold text-slate-800">Ready to start your day?</p>
          <p className="text-sm text-slate-500 mt-0.5">Track your 8-hour daily work session</p>
        </div>
      </div>
      <button onClick={handleStart} disabled={loading}
        className="flex items-center justify-center gap-2
          bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400
          text-white px-5 py-2.5 rounded-lg text-sm font-bold
          hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5
          transition-all duration-200 disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm">
        <Play className="w-4 h-4" fill="currentColor" />
        {loading ? "Starting..." : "Start Day"}
      </button>
    </div>
  );

  if (log.status === "completed") {
    const total = log.endTime
      ? Math.floor((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000) - (log.totalPausedSeconds ?? 0)
      : 0;
    const eff = Math.round((total / WORK_DAY_SECS) * 100);
    const effGrad = eff >= 100 ? "from-emerald-500 to-teal-500" : eff >= 60 ? "from-amber-500 to-yellow-500" : "from-red-500 to-rose-500";
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-bold text-slate-800">Work day complete!</p>
              <p className="text-sm text-slate-500 mt-0.5">{formatTime12(log.startTime)} → {log.endTime ? formatTime12(log.endTime) : "—"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black font-mono tabular-nums text-slate-800">{formatHMS(total)}</p>
            <span className={`inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-md text-white bg-gradient-to-r ${effGrad}`}>
              {eff}% efficiency
            </span>
          </div>
        </div>
      </div>
    );
  }

  const isPaused = log.status === "paused";
  const pct = Math.min((elapsed / WORK_DAY_SECS) * 100, 100);
  const isOvertime = elapsed > WORK_DAY_SECS;
  const barGrad = isPaused ? "from-slate-400 to-slate-500"
    : isOvertime ? "from-red-500 to-rose-500"
    : pct >= 75 ? "from-amber-400 to-yellow-500"
    : "from-emerald-500 to-teal-400";

  return (
    <div className={`bg-white border rounded-xl shadow-sm p-5 mb-5 animate-fade-in-up
      ${isPaused ? "border-amber-200" : "border-slate-200"}`}>
      <style>{`
        @keyframes t-bob {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-2px); }
        }
        @keyframes t-leg-a {
          0%,100% { transform: rotate(-30deg); }
          50%      { transform: rotate(30deg); }
        }
        @keyframes t-leg-b {
          0%,100% { transform: rotate(30deg); }
          50%      { transform: rotate(-30deg); }
        }
        @keyframes t-head {
          0%,100% { transform: translateY(0px) rotate(-4deg); }
          50%      { transform: translateY(-1px) rotate(4deg); }
        }
        .t-body   { animation: t-bob  0.85s ease-in-out infinite; }
        .t-leg-a  { animation: t-leg-a 0.85s ease-in-out infinite; }
        .t-leg-b  { animation: t-leg-b 0.85s ease-in-out infinite; }
        .t-head   { animation: t-head  0.85s ease-in-out infinite; transform-origin: 2px 8px; }
      `}</style>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? "bg-amber-400" : "bg-emerald-500"}`} />
            {!isPaused && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{isPaused ? "Day paused" : "Work in progress"}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Started {formatTime12(log.startTime)}
              {isPaused && log.pausedAt && <span className="ml-2 text-amber-500">· Paused {formatTime12(log.pausedAt)}</span>}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black font-mono tabular-nums leading-none
            ${isPaused ? "text-amber-500" : isOvertime ? "text-red-500" : "text-slate-800"}`}>
            {formatHMS(elapsed)}
          </p>
          {isOvertime && !isPaused && <p className="text-[11px] text-red-400 font-semibold mt-0.5">+{formatHMS(elapsed - WORK_DAY_SECS)} overtime</p>}
          {isPaused && <p className="text-[11px] text-amber-400 font-semibold mt-0.5">Timer paused</p>}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
          <span className="font-medium">{Math.round(pct)}% of 8h</span>
          <span>{isOvertime ? "Overtime!" : `${formatHMS(WORK_DAY_SECS - elapsed)} remaining`}</span>
        </div>
        <div className="relative w-full" style={{ height: "48px" }}>
          <div className="absolute bottom-0 inset-x-0 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${barGrad} transition-all duration-1000`}
              style={{ width: `${pct}%` }} />
          </div>
          {!isPaused && (
            <span
              aria-hidden="true"
              className="absolute transition-[left] duration-1000"
              style={{
                left: `clamp(0%, calc(${pct}% - 1.5rem), calc(100% - 3rem))`,
                bottom: "8px",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.18))",
              }}
            >
              {/* Side-profile turtle facing right */}
              <svg width="64" height="40" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g className="t-body">
                  {/* Tail */}
                  <path d="M10 26 Q5 24 4 28 Q3 30 6 29" fill="#4ade80" />

                  {/* Back legs (drawn behind body) — diagonal pair A=FL+RR, B=FR+RL */}
                  <g className="t-leg-b" style={{ transformOrigin: "16px 28px" }}>
                    <rect x="13" y="28" width="6" height="12" rx="3" fill="#22c55e" />
                  </g>
                  <g className="t-leg-a" style={{ transformOrigin: "26px 28px" }}>
                    <rect x="23" y="28" width="6" height="12" rx="3" fill="#22c55e" />
                  </g>

                  {/* Belly */}
                  <ellipse cx="28" cy="27" rx="20" ry="7" fill="#4ade80" />

                  {/* Shell dome */}
                  <ellipse cx="27" cy="20" rx="19" ry="14" fill="#15803d" />
                  {/* Shell top highlight band */}
                  <ellipse cx="24" cy="15" rx="12" ry="7" fill="#166534" />
                  {/* Shell center scute */}
                  <ellipse cx="24" cy="15" rx="6" ry="4" fill="#14532d" opacity="0.5" />
                  {/* Shell scute lines */}
                  <line x1="24" y1="10" x2="24" y2="22" stroke="#14532d" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
                  <line x1="15" y1="14" x2="33" y2="18" stroke="#14532d" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
                  <line x1="33" y1="14" x2="15" y2="18" stroke="#14532d" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
                  {/* Shell shine */}
                  <ellipse cx="20" cy="12" rx="5" ry="3" fill="white" opacity="0.13" />

                  {/* Front legs (drawn in front of body) */}
                  <g className="t-leg-a" style={{ transformOrigin: "36px 28px" }}>
                    <rect x="33" y="28" width="6" height="12" rx="3" fill="#4ade80" />
                  </g>
                  <g className="t-leg-b" style={{ transformOrigin: "44px 28px" }}>
                    <rect x="41" y="28" width="6" height="12" rx="3" fill="#4ade80" />
                  </g>

                  {/* Neck */}
                  <ellipse cx="49" cy="25" rx="6" ry="5" fill="#4ade80" />

                  {/* Head */}
                  <g className="t-head">
                    <ellipse cx="57" cy="22" rx="7" ry="6" fill="#4ade80" />
                    {/* Eye */}
                    <circle cx="60" cy="19" r="1.8" fill="#14532d" />
                    <circle cx="60.7" cy="18.3" r="0.6" fill="white" />
                    {/* Nostril */}
                    <circle cx="63" cy="22" r="0.8" fill="#166534" opacity="0.7" />
                    {/* Mouth */}
                    <path d="M61 24 Q63 25.5 64 24" stroke="#166534" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.6" />
                  </g>
                </g>
              </svg>
            </span>
          )}
        </div>
      </div>

      {showEndConfirm && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-scale-in">
          <p className="text-sm font-bold text-red-700 mb-1">End your work day?</p>
          <p className="text-xs text-red-400 mb-3">This stops the timer permanently for today.</p>
          <div className="flex gap-2">
            <button onClick={handleEnd} disabled={loading}
              className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400
                text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-150
                disabled:opacity-50 cursor-pointer active:scale-95">
              {loading ? "Ending..." : "Yes, End Day"}
            </button>
            <button onClick={() => setShowEndConfirm(false)} disabled={loading}
              className="bg-white text-slate-700 border border-slate-200 px-4 py-1.5
                rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer active:scale-95">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {isPaused ? (
          <button onClick={handleResume} disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500
              hover:from-emerald-400 hover:to-teal-400 text-white px-5 py-2 rounded-lg text-sm font-bold
              hover:shadow-md hover:shadow-emerald-500/25 hover:-translate-y-0.5
              transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm">
            <Play className="w-3.5 h-3.5" fill="currentColor" />
            {loading ? "Resuming..." : "Resume"}
          </button>
        ) : (
          <button onClick={handlePause} disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400
              hover:from-amber-300 hover:to-yellow-300 text-amber-900 px-5 py-2 rounded-lg text-sm font-bold
              hover:shadow-md hover:shadow-amber-400/25 hover:-translate-y-0.5
              transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm">
            <Pause className="w-3.5 h-3.5" fill="currentColor" />
            {loading ? "Pausing..." : "Pause"}
          </button>
        )}
        <button onClick={() => setShowEndConfirm(true)} disabled={loading || showEndConfirm}
          className="flex items-center gap-2 bg-white text-slate-500 hover:text-red-500
            border border-slate-200 hover:border-red-200 hover:bg-red-50
            px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150
            disabled:opacity-50 cursor-pointer active:scale-95">
          <StopCircle className="w-3.5 h-3.5" />
          End Day
        </button>
      </div>
    </div>
  );
}
