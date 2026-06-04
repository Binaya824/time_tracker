type BadgeVariant = "todo" | "in_progress" | "review" | "completed" | "on_hold" | "active"
  | "low" | "medium" | "high" | "admin" | "manager" | "employee"
  | "Feature" | "Bug" | "Research" | "Improvement" | "Deployment" | "Testing" | "Others";

const styles: Record<BadgeVariant, string> = {
  todo:        "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  review:      "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  completed:   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  on_hold:     "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  active:      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  low:         "bg-slate-100 text-slate-500",
  medium:      "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  high:        "bg-red-50 text-red-600 ring-1 ring-red-200",
  admin:       "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  manager:     "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  employee:    "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  Feature:     "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  Bug:         "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  Research:    "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  Improvement: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  Deployment:  "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
  Testing:     "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Others:      "bg-gray-100 text-gray-600",
};

const labels: Record<BadgeVariant, string> = {
  todo: "Todo", in_progress: "In Progress", review: "In Review", completed: "Completed",
  on_hold: "On Hold", active: "Active", low: "Low", medium: "Medium", high: "High",
  admin: "Admin", manager: "Manager", employee: "Employee",
  Feature: "Feature", Bug: "Bug", Research: "Research", Improvement: "Improvement",
  Deployment: "Deployment", Testing: "Testing", Others: "Others",
};

const dots: Partial<Record<BadgeVariant, string>> = {
  in_progress: "bg-blue-500", completed: "bg-emerald-500",
  active: "bg-emerald-500", review: "bg-amber-500", high: "bg-red-500",
};

export default function Badge({ variant }: { variant: BadgeVariant }) {
  const dot = dots[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ${styles[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />}
      {labels[variant]}
    </span>
  );
}
