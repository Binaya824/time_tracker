"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "xl";
}

export default function Modal({ title, onClose, children, size = "md" }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const maxW = size === "xl" ? "max-w-4xl" : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
      bg-black/50 p-0 sm:p-4 animate-fade-in">
      <div className={`bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full ${maxW}
        max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-slate-200 animate-scale-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg
              bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500
              transition-all duration-150 cursor-pointer active:scale-90">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}
