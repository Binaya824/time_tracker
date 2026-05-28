import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import TimeEntry from "@/lib/models/TimeEntry";
import DailyLog from "@/lib/models/DailyLog";
import StatCard from "@/components/StatCard";
import AdminCharts, { type StatusDatum, type TrendDatum, type EmpDatum } from "@/components/AdminCharts";
import Link from "next/link";
import Badge from "@/components/Badge";
import { Users, FolderKanban, CheckSquare, UserCog, ArrowRight } from "lucide-react";

/* ── Status colour map ───────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  todo:        "#94a3b8",
  in_progress: "#3b82f6",
  review:      "#f59e0b",
  completed:   "#10b981",
  on_hold:     "#f97316",
};
const STATUS_LABELS: Record<string, string> = {
  todo: "Todo", in_progress: "In Progress", review: "In Review",
  completed: "Completed", on_hold: "On Hold",
};

export default async function AdminDashboard() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") redirect("/login");
  await connectDB();

  /* ── Basic counts ────────────────────────────────────────── */
  const [totalUsers, totalProjects, totalTasks, recentProjects] = await Promise.all([
    User.countDocuments(),
    Project.countDocuments(),
    Task.countDocuments(),
    Project.find().populate("managers", "name").sort({ createdAt: -1 }).limit(5),
  ]);
  const managers  = await User.countDocuments({ role: "manager" });
  const employees = await User.countDocuments({ role: "employee" });

  /* ── Chart 1: Task Status Distribution ──────────────────── */
  const statusAgg = await Task.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const statusData: StatusDatum[] = statusAgg.map(s => ({
    name:  STATUS_LABELS[s._id] ?? s._id,
    value: s.count,
    color: STATUS_COLORS[s._id] ?? "#94a3b8",
  }));

  /* ── Chart 2: Daily Work Hours Trend (last 14 days) ─────── */
  const trendData: TrendDatum[] = [];
  const today = new Date();
  // Build date strings for last 14 days
  const datestrs: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    datestrs.push(d.toISOString().slice(0, 10));
  }
  const sinceStr = datestrs[0];

  const allLogs = await DailyLog.find({
    date: { $gte: sinceStr },
    status: "completed",
  });

  for (const dateStr of datestrs) {
    const logsForDay = allLogs.filter(l => l.date === dateStr);
    let totalHours = 0;
    for (const log of logsForDay) {
      if (log.startTime && log.endTime) {
        const activeSecs = Math.max(
          0,
          (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000 -
          (log.totalPausedSeconds ?? 0)
        );
        totalHours += activeSecs / 3600;
      }
    }
    const d = new Date(dateStr + "T00:00:00");
    trendData.push({
      date:  d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      hours: Math.round(totalHours * 10) / 10,
      logs:  logsForDay.length,
    });
  }

  /* ── Chart 3: Employee Performance ──────────────────────── */
  const empUsers = await User.find({ role: "employee" }, "_id name").lean();
  const allTasks = await Task.find({}).lean();
  const allEntries = await TimeEntry.find({ status: "stopped" }).lean();

  const empData: EmpDatum[] = [];

  for (const emp of empUsers) {
    const uid = emp._id.toString();

    // tasks assigned to this employee
    const myTasks = allTasks.filter(t =>
      (t.assignedTo as unknown as { toString(): string }[])
        .some(a => a.toString() === uid)
    );

    // time entries for this employee
    const myEntries = allEntries.filter(e => e.user.toString() === uid);
    const totalSecs = myEntries.reduce((s, e) => s + (e.duration ?? 0), 0);

    const completedTasks = myTasks.filter(t => t.status === "completed");
    let onTime = 0;
    let overTime = 0;

    for (const task of completedTasks) {
      if (!task.dueHour) continue;
      const taskSecs = myEntries
        .filter(e => e.task.toString() === task._id.toString())
        .reduce((s, e) => s + (e.duration ?? 0), 0);
      if (taskSecs <= task.dueHour * 3600) onTime++;
      else overTime++;
    }

    const pending = myTasks.filter(
      t => t.status !== "completed" && t.status !== "on_hold"
    ).length;

    if (myTasks.length === 0 && totalSecs === 0) continue; // skip inactive employees

    empData.push({
      name:     emp.name.split(" ")[0], // first name to keep bar labels short
      logged:   Math.round(totalSecs / 3600 * 10) / 10,
      onTime,
      overTime,
      pending,
    });
  }

  // Sort by logged hours descending
  empData.sort((a, b) => b.logged - a.logged);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">

      {/* ── Page header ── */}
      <div className="mb-7 animate-fade-in-up">
        <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1.5">Admin Portal</p>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Good day,{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            {authUser.name}
          </span>
        </h1>
        <p className="text-slate-500 mt-1.5">Here&apos;s what&apos;s happening across your workspace.</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: "Total Users",   value: totalUsers,    Icon: Users,       gradient: "from-indigo-500 to-violet-500" },
          { label: "Projects",      value: totalProjects, Icon: FolderKanban,gradient: "from-blue-500 to-cyan-500" },
          { label: "Total Tasks",   value: totalTasks,    Icon: CheckSquare, gradient: "from-emerald-500 to-teal-500" },
          { label: "Managers",      value: managers,      Icon: UserCog,     gradient: "from-violet-500 to-purple-500" },
        ].map((card, i) => (
          <div key={card.label} className="animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
            <StatCard {...card} icon="" color="text-white" />
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <AdminCharts
        statusData={statusData}
        trendData={trendData}
        empData={empData}
      />

      {/* ── Bottom panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Recent Projects */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 sm:p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900">Recent Projects</h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest activity</p>
            </div>
            <Link href="/dashboard/admin/projects"
              className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
              View all <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="py-10 text-center">
              <FolderKanban className="w-8 h-8 text-slate-200 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-slate-400 text-sm">No projects yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentProjects.map((p, i) => (
                <div key={p._id.toString()}
                  className="group flex items-center justify-between gap-3 px-3 py-3 rounded-lg
                    hover:bg-slate-50 transition-all duration-150 cursor-default animate-fade-in-up"
                  style={{ animationDelay: `${(i + 4) * 60}ms` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100
                      flex items-center justify-center flex-shrink-0 transition-colors">
                      <FolderKanban className="w-4 h-4 text-indigo-500" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {(p.managers as unknown as { name: string }[]).map(m => m.name).join(", ") || "No manager"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={p.status as "active" | "completed" | "on_hold"} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 sm:p-6 animate-fade-in-up">
          <div className="mb-5">
            <h2 className="font-bold text-slate-900">Quick Actions</h2>
            <p className="text-xs text-slate-400 mt-0.5">Jump to common tasks</p>
          </div>
          <div className="space-y-3">
            {[
              {
                href: "/dashboard/admin/users",
                Icon: Users, grad: "from-indigo-500 to-violet-500",
                title: "Manage Users",
                desc: `${employees} employees · ${managers} managers`,
                hoverArrow: "group-hover:text-indigo-500",
              },
              {
                href: "/dashboard/admin/projects",
                Icon: FolderKanban, grad: "from-blue-500 to-cyan-500",
                title: "Manage Projects",
                desc: `${totalProjects} total projects`,
                hoverArrow: "group-hover:text-blue-500",
              },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="group flex items-center gap-4 p-4 rounded-lg border border-slate-100
                  bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5
                  transition-all duration-200">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.grad}
                  flex items-center justify-center flex-shrink-0 shadow-sm
                  group-hover:scale-105 transition-transform duration-200`}>
                  <item.Icon className="w-5 h-5 text-white" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <ArrowRight className={`w-4 h-4 text-slate-300 ${item.hoverArrow} flex-shrink-0
                  group-hover:translate-x-0.5 transition-all duration-200`} />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
