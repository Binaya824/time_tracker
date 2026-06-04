"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  title: string; message: string; confirmLabel?: string;
  onConfirm: () => Promise<void>; onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = "Delete", onConfirm, onCancel }: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 animate-scale-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" strokeWidth={2} />
          </div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6 pl-[52px]">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200
              rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer active:scale-95">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="px-4 py-2 text-sm font-bold text-white
              bg-gradient-to-r from-red-500 to-rose-500
              rounded-lg hover:from-red-400 hover:to-rose-400
              hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5
              transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95">
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
