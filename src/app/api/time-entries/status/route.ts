import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TimeEntry from "@/lib/models/TimeEntry";
import { getAuthUser } from "@/lib/auth";

// GET /api/time-entries/status?taskId=xxx
// Returns the current timer state for the logged-in user on a task
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

    // Get the most recent entry for this user+task
    const latest = await TimeEntry.findOne({
      task: taskId,
      user: authUser.userId,
    }).sort({ createdAt: -1 });

    // Total completed seconds (stopped + paused entries)
    const completedEntries = await TimeEntry.find({
      task: taskId,
      user: authUser.userId,
      status: { $in: ["stopped", "paused"] },
    });
    const totalCompletedSeconds = completedEntries.reduce(
      (sum, e) => sum + (e.duration ?? 0),
      0
    );

    let timerStatus: "idle" | "running" | "paused" = "idle";
    let runningEntry = null;

    if (latest) {
      if (latest.status === "running") {
        timerStatus = "running";
        runningEntry = latest;
      } else if (latest.status === "paused") {
        timerStatus = "paused";
      }
    }

    return NextResponse.json({
      timerStatus,
      runningEntry,
      totalCompletedSeconds,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
