type BadgeVariant = "todo" | "in_progress" | "review" | "completed" | "on_hold" | "active" | "low" | "medium" | "high" | "admin" | "manager" | "employee";

const styles: Record<BadgeVariant, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  on_hold: "bg-orange-100 text-orange-700",
  active: "bg-green-100 text-green-700",
  low: "bg-slate-100 text-slate-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
  admin: "bg-indigo-100 text-indigo-700",
  manager: "bg-emerald-100 text-emerald-700",
  employee: "bg-violet-100 text-violet-700",
};

const labels: Record<BadgeVariant, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  review: "In Review",
  completed: "Completed",
  on_hold: "On Hold",
  active: "Active",
  low: "Low",
  medium: "Medium",
  high: "High",
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

export default function Badge({ variant }: { variant: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {labels[variant]}
    </span>
  );
}
