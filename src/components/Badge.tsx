type BadgeVariant = "todo" | "in_progress" | "review" | "completed" | "on_hold" | "active" | "low" | "medium" | "high" | "admin" | "manager" | "employee" | "Feature" | "Bug" | "Research" | "Improvement" | "Deployment" | "Testing" | "Others";

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
  Feature: "bg-purple-100 text-purple-700",
  Bug: "bg-rose-100 text-rose-700",
  Research: "bg-cyan-100 text-cyan-700",
  Improvement: "bg-teal-100 text-teal-700",
  Deployment: "bg-fuchsia-100 text-fuchsia-700",
  Testing: "bg-amber-100 text-amber-700",
  Others: "bg-gray-100 text-gray-700",
};

const labels: Record<BadgeVariant, string> = {
  todo: "Status: Todo",
  in_progress: "Status: In Progress",
  review: "Status: In Review",
  completed: "Status: Completed",
  on_hold: "Status: On Hold",
  active: "Status: Active",
  low: "Priority: Low",
  medium: "Priority: Medium",
  high: "Priority: High",
  admin: "Role: Admin",
  manager: "Role: Manager",
  employee: "Role: Employee",
  Feature: "Type: Feature",
  Bug: "Type: Bug",
  Research: "Type: Research",
  Improvement: "Type: Improvement",
  Deployment: "Type: Deployment",
  Testing: "Type: Testing",
  Others: "Type: Others",
};

export default function Badge({ variant }: { variant: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {labels[variant]}
    </span>
  );
}
