import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/lib/models/Task";
import Project from "@/lib/models/Project";
import { getAuthUser } from "@/lib/auth";

// GET /api/tasks?projectId=xxx
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const filter: Record<string, unknown> = {};
    if (projectId) filter.project = projectId;

    if (authUser.role === "employee") {
      filter.assignedTo = authUser.userId;
    }

    const tasks = await Task.find(filter)
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ tasks });
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
    const { title, description, projectId, assignedTo, priority, dueDate } =
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

    const task = await Task.create({
      title,
      description: description ?? "",
      project: projectId,
      assignedTo: assignedTo ?? [],
      priority: priority ?? "medium",
      dueDate: dueDate ?? undefined,
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
