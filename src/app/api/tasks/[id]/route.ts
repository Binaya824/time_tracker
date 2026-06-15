import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/lib/models/Task";
import TimeEntry from "@/lib/models/TimeEntry";  
import { getAuthUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;

    const task = await Task.findById(id)
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json({ task });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    if (authUser.role === "employee") {
      if (task.allowEmployeeStatusUpdate === false) {
        return NextResponse.json({ error: "You do not have permission to update the status of this task" }, { status: 403 });
      }
      if (task.status === "review") {
        return NextResponse.json({ error: "Task is in review. Only a manager can update the status." }, { status: 403 });
      }
      const allowedStatuses = ["in_progress", "review"];
      if (body.status && !allowedStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Employees can only set status to in_progress or review" }, { status: 403 });
      }

      //  Auto stop timer when setting review
      if (body.status === "review") {
        const running = await TimeEntry.findOne({
          task: id,
          user: authUser.userId,
          status: "running",
        });
        if (running) {
          const endTime = new Date();
          running.endTime = endTime;
          running.duration = Math.floor(
            (endTime.getTime() - running.startTime.getTime()) / 1000
          );
          running.status = "stopped";
          await running.save();
        }

        //   Stop paused entry too
        await TimeEntry.updateMany(
          { task: id, user: authUser.userId, status: "paused" },
          { $set: { status: "stopped" } }
        );
      }

      task.status = body.status ?? task.status;
    } else {
      Object.assign(task, body);
    }

    await task.save();

    const populated = await task.populate([
      { path: "project", select: "name" },
      { path: "assignedTo", select: "name email" },
      { path: "createdBy", select: "name email" },
    ]);

    return NextResponse.json({ task: populated });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["admin", "manager"].includes(authUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    await Task.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}