import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TimeEntry from "@/lib/models/TimeEntry";
import Task from "@/lib/models/Task";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { taskId } = await req.json();

    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

    // Check if there is already a running entry for this user+task
    const existing = await TimeEntry.findOne({
      task: taskId,
      user: authUser.userId,
      status: "running",
    });

    if (existing) {
      return NextResponse.json({ error: "Timer is already running" }, { status: 409 });
    }

    const entry = await TimeEntry.create({
      task: taskId,
      user: authUser.userId,
      startTime: new Date(),
      status: "running",
    });

    // Set task to in_progress
    await Task.findByIdAndUpdate(taskId, { status: "in_progress" });

    return NextResponse.json({ entry }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
