import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import TimeEntry from "@/lib/models/TimeEntry";
import PerformanceView, {
  calcTaskScore,
  type Employee,
  type ProjSummary,
  type ProjectDetail,
} from "@/components/PerformanceView";

const BASE_PATH = "/dashboard/admin/performance";
const PAGE_SIZE = 8;

export default async function AdminPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; page?: string; search?: string; pid?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") redirect("/login");

  await connectDB();

  const { project: projectParam, page: pageParam, search: searchRaw, pid: pidParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1"));
  const searchQ = (searchRaw ?? "").toLowerCase().trim();

  // Admin sees ALL projects (no manager filter)
  const projects = await Project.find();
  const projectIds = projects.map((p) => p._id);
  const tasks = await Task.find({ project: { $in: projectIds } }).populate("assignedTo", "name email");
  const taskIds = tasks.map((t) => t._id);
  const timeEntries = await TimeEntry.find({ task: { $in: taskIds } });

  const empTaskTime: Record<string, Record<string, number>> = {};
  for (const e of timeEntries) {
    const uid = e.user.toString();
    const tid = e.task.toString();
    if (!empTaskTime[uid]) empTaskTime[uid] = {};
    empTaskTime[uid][tid] = (empTaskTime[uid][tid] ?? 0) + (e.duration ?? 0);
  }

  // ─── Project detail view ──────────────────────────────────────────────────
  if (projectParam) {
    const proj = projects.find((p) => p._id.toString() === projectParam);
    if (!proj) redirect(BASE_PATH);

    const projectTasks = tasks.filter((t) => t.project.toString() === projectParam);
    const empMap: Record<string, Employee> = {};

    for (const t of projectTasks) {
      const assigned = t.assignedTo as unknown as { _id: { toString(): string }; name: string }[];
      for (const u of assigned) {
        const uid = u._id.toString();
        if (!empMap[uid]) empMap[uid] = { name: u.name, tasks: [] };
        empMap[uid].tasks.push({
          taskId: t._id.toString(),
          title: t.title,
          status: t.status,
          dueHour: t.dueHour,
          actualSeconds: empTaskTime[uid]?.[t._id.toString()] ?? 0,
        });
      }
    }

    const project: ProjectDetail = {
      id: proj._id.toString(),
      name: proj.name,
      status: proj.status,
      employees: Object.values(empMap),
    };

    return <PerformanceView mode="detail" basePath={BASE_PATH} accentColor="indigo" project={project} />;
  }

  // ─── Project list view ────────────────────────────────────────────────────
  const projSummaries: ProjSummary[] = projects.map((proj) => {
    const projId = proj._id.toString();
    const projectTasks = tasks.filter((t) => t.project.toString() === projId);
    const allScores: number[] = [];
    const empSet = new Set<string>();

    for (const t of projectTasks) {
      const assigned = t.assignedTo as unknown as { _id: { toString(): string } }[];
      for (const u of assigned) {
        empSet.add(u._id.toString());
        if (t.status === "completed" && t.dueHour) {
          const uid = u._id.toString();
          const actualSecs = empTaskTime[uid]?.[t._id.toString()] ?? 0;
          const score = calcTaskScore(t.dueHour * 3600, actualSecs);
          if (score !== null) allScores.push(score);
        }
      }
    }

    return {
      id: projId,
      name: proj.name,
      status: proj.status,
      employeeCount: empSet.size,
      scoredTasks: allScores.length,
      teamScore:
        allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : null,
    };
  });

  const statusFilter = pidParam;
  let filtered = [...projSummaries];
  if (searchQ) filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchQ));
  if (statusFilter && ["active", "completed", "on_hold"].includes(statusFilter)) {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pageNums: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) pageNums.push(i);
    else if (pageNums[pageNums.length - 1] !== "...") pageNums.push("...");
  }

  return (
    <PerformanceView
      mode="list"
      basePath={BASE_PATH}
      accentColor="indigo"
      summaries={paged}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      pageNums={pageNums}
      searchRaw={searchRaw}
      pidParam={pidParam}
    />
  );
}
