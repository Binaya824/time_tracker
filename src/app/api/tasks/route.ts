import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/lib/models/Task";
import Project from "@/lib/models/Project";
import { getAuthUser } from "@/lib/auth";

// GET /api/tasks?projectId=xxx&search=xxx&status=xxx&priority=xxx&type=xxx&page=1&limit=10
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status") ?? "";
    const priority = searchParams.get("priority") ?? "";
    const type = searchParams.get("type") ?? "";

    const filter: Record<string, unknown> = {};
    if (projectId) filter.project = projectId;
    if (authUser.role === "employee") filter.assignedTo = authUser.userId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;

    if (search) {
      const taskNoSearch = Number(search.replace(/^#/, ""));
      if (!isNaN(taskNoSearch) && taskNoSearch > 0) {
        filter.$or = [
          { title: { $regex: search, $options: "i" } },
          { taskNo: taskNoSearch },
        ];
      } else {
        filter.title = { $regex: search, $options: "i" };
      }
    }

    const pageParam = searchParams.get("page");
    const limit = Math.max(1, parseInt(searchParams.get("limit") ?? "10"));
    const page = pageParam ? Math.max(1, parseInt(pageParam)) : null;

    const baseQuery = Task.find(filter)
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ taskNo: -1 });

    let tasks, total: number | undefined, totalPages: number | undefined;
    if (page !== null) {
      [tasks, total] = await Promise.all([
        baseQuery.clone().skip((page - 1) * limit).limit(limit),
        Task.countDocuments(filter),
      ]);
      totalPages = Math.ceil(total / limit);
    } else {
      tasks = await baseQuery;
    }

    return NextResponse.json({ tasks, ...(page !== null ? { total, page, totalPages } : {}) });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/tasks - Manager only
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["admin", "manager"].includes(authUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { title, description, projectId, assignedTo, priority, type, dueDate, dueHour, allowEmployeeStatusUpdate } =
      await req.json();

    if (!title || !projectId) {
      return NextResponse.json(
        { error: "Title and project are required" },
        { status: 400 }
      );
    }

    // Verify project exists and manager is assigned
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (
      authUser.role === "manager" &&
      !project.managers.some((m) => m.toString() === authUser.userId)
    ) {
      return NextResponse.json(
        { error: "You are not a manager of this project" },
        { status: 403 }
      );
    }

    const lastTask = await Task.findOne({}, { taskNo: 1 }).sort({ taskNo: -1 });
    const nextTaskNo = (lastTask?.taskNo ?? 0) + 1;

    console.log("[tasks POST] dueHour received:", dueHour, typeof dueHour);
    const task = await Task.create({
      taskNo: nextTaskNo,
      title,
      description: description ?? "",
      project: projectId,
      assignedTo: assignedTo ?? [],
      priority: priority ?? "medium",
      type: type ?? "Others",
      allowEmployeeStatusUpdate: allowEmployeeStatusUpdate ?? true,
      dueDate: dueDate ?? undefined,
      dueHour: dueHour ?? undefined,
      createdBy: authUser.userId,
    });

    const populated = await task.populate([
      { path: "project", select: "name" },
      { path: "assignedTo", select: "name email" },
      { path: "createdBy", select: "name email" },
    ]);

    return NextResponse.json({ task: populated }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
