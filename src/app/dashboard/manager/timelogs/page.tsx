import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import TimeEntry from "@/lib/models/TimeEntry";
import DailyLog from "@/lib/models/DailyLog";
import DailyLogsView, { type DayLog } from "@/components/DailyLogsView";

const BASE_PATH = "/dashboard/manager/timelogs";
const PAGE_SIZE = 5;

export default async function DailyLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    projectId?: string;
    name?: string;
    email?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "manager") redirect("/login");

  await connectDB();

  const { projectId, name: nameFilter = "", email: emailFilter = "", startDate, endDate, page: pageParam } =
    await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1"));

  const projects = await Project.find({ managers: authUser.userId });
  const selectedProject = projectId ? projects.find((p) => p._id.toString() === projectId) : null;
  const filteredProjects = selectedProject ? [selectedProject] : projects;
  const projectIds = filteredProjects.map((p) => p._id);

  const defaultSince = new Date();
  defaultSince.setDate(defaultSince.getDate() - 30);
  defaultSince.setHours(0, 0, 0, 0);
  const sinceDate = startDate ?? defaultSince.toISOString().slice(0, 10);
  const sinceDateTime = new Date(sinceDate + "T00:00:00");
  const untilDateTime = endDate ? new Date(endDate + "T23:59:59") : null;

  const taskIds = await Task.find({ project: { $in: projectIds } }, "_id").then((docs) =>
    docs.map((d) => d._id)
  );

  const teFilter: Record<string, unknown> = { task: { $in: taskIds }, startTime: { $gte: sinceDateTime } };
  if (untilDateTime) (teFilter.startTime as Record<string, Date>).$lte = untilDateTime;
  const entries = await TimeEntry.find(teFilter).populate("user", "name email").sort({ startTime: 1 });

  const allProjects = await Project.find({ managers: authUser.userId }).populate("employees", "name email");
  type PopUser = { _id: { toString(): string }; name: string; email: string };
  const empSet = new Map<string, PopUser>();
  for (const p of allProjects) {
    for (const emp of p.employees as unknown as PopUser[]) empSet.set(emp._id.toString(), emp);
  }
  const employeeIds = Array.from(empSet.keys());

  const dlFilter: Record<string, unknown> = { user: { $in: employeeIds }, date: { $gte: sinceDate } };
  if (endDate) (dlFilter.date as Record<string, string>).$lte = endDate;
  const dailyLogDocs = await DailyLog.find(dlFilter);

  const dlMap: Record<string, { startTime: Date; endTime: Date | null; totalPausedSeconds: number; status: string }> = {}; // ✅
  for (const dl of dailyLogDocs) {
    dlMap[`${dl.user.toString()}-${dl.date}`] = {
      startTime: dl.startTime,
      endTime: dl.endTime ?? null,
      totalPausedSeconds: dl.totalPausedSeconds,
      status: dl.status, // ✅
    };
  }

  const dateMap: Record<string, DayLog> = {};

  for (const e of entries) {
    const u = e.user as unknown as PopUser;
    const uid = u._id.toString();
    const dateKey = e.startTime.toISOString().slice(0, 10);
    const dur = e.duration ?? 0;
    const dl = dlMap[`${uid}-${dateKey}`];

    if (!dateMap[dateKey]) dateMap[dateKey] = { date: dateKey, employees: {} };
    if (!dateMap[dateKey].employees[uid]) {
      dateMap[dateKey].employees[uid] = {
        name: u.name,
        email: u.email,
        totalSeconds: 0,
        startTime: dl?.startTime?.toISOString() ?? null,
        endTime: dl?.endTime?.toISOString() ?? null,
        totalPausedSeconds: dl?.totalPausedSeconds ?? 0,
        status: (dl?.status as "active" | "paused" | "completed" | null) ?? null, // ✅

      };
    }
    dateMap[dateKey].employees[uid].totalSeconds += dur;
  }

  for (const dl of dailyLogDocs) {
    const uid = dl.user.toString();
    const emp = empSet.get(uid);
    if (!emp) continue;
    if (!dateMap[dl.date]) dateMap[dl.date] = { date: dl.date, employees: {} };
    if (!dateMap[dl.date].employees[uid]) {
      dateMap[dl.date].employees[uid] = {
        name: emp.name,
        email: emp.email,
        totalSeconds: 0,
        startTime: dl.startTime?.toISOString() ?? null,
        endTime: dl.endTime?.toISOString() ?? null,
        totalPausedSeconds: dl.totalPausedSeconds,
        status: (dl.status as "active" | "paused" | "completed" | null) ?? null, // ✅

      };
    } else {
      dateMap[dl.date].employees[uid].startTime = dl.startTime?.toISOString() ?? null;
      dateMap[dl.date].employees[uid].endTime = dl.endTime?.toISOString() ?? null;
      dateMap[dl.date].employees[uid].totalPausedSeconds = dl.totalPausedSeconds;
      dateMap[dl.date].employees[uid].status = (dl.status as "active" | "paused" | "completed" | null) ?? null; // ✅

    }
  }

  const nameQ = nameFilter.toLowerCase();
  const emailQ = emailFilter.toLowerCase();
  const allLogs = Object.values(dateMap)
    .map((day) => {
      const filtered = Object.fromEntries(
        Object.entries(day.employees).filter(([, emp]) => {
          const nMatch = !nameQ || emp.name.toLowerCase().includes(nameQ);
          const eMatch = !emailQ || emp.email.toLowerCase().includes(emailQ);
          return nMatch && eMatch;
        })
      );
      return { ...day, employees: filtered };
    })
    .filter((day) => Object.keys(day.employees).length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalDates = allLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalDates / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedLogs = allLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const baseParams = new URLSearchParams();
  if (projectId) baseParams.set("projectId", projectId);
  if (nameFilter) baseParams.set("name", nameFilter);
  if (emailFilter) baseParams.set("email", emailFilter);
  if (startDate) baseParams.set("startDate", startDate);
  if (endDate) baseParams.set("endDate", endDate);

  const pageNums: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) pageNums.push(i);
    else if (pageNums[pageNums.length - 1] !== "...") pageNums.push("...");
  }

  return (
    <DailyLogsView
      basePath={BASE_PATH}
      accentColor="emerald"
      projects={projects.map((p) => ({ id: p._id.toString(), name: p.name }))}
      pagedLogs={pagedLogs}
      totalDates={totalDates}
      currentPage={currentPage}
      totalPages={totalPages}
      pageNums={pageNums}
      projectId={projectId}
      nameFilter={nameFilter}
      emailFilter={emailFilter}
      startDate={startDate}
      endDate={endDate}
      baseParamsStr={baseParams.toString()}
    />
  );
}
