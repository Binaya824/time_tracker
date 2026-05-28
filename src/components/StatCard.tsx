import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  Icon?: LucideIcon;
  gradient?: string;
}

export default function StatCard({ label, value, icon, color = "bg-blue-50 text-blue-600", Icon, gradient }: StatCardProps) {
  return (
    <div className="group bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4
      shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
        transition-transform duration-200 group-hover:scale-105
        ${gradient ? `bg-gradient-to-br ${gradient} text-white` : color}`}>
        {Icon
          ? <Icon className="w-6 h-6" strokeWidth={1.75} />
          : <span className="text-2xl leading-none">{icon}</span>}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-black text-slate-900 mt-0.5 tabular-nums leading-none">{value}</p>
      </div>
    </div>
  );
}
