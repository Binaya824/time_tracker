import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TimeEntry from "@/lib/models/TimeEntry";
import { getAuthUser } from "@/lib/auth";

// GET /api/time-entries?taskId=xxx&userId=xxx
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const userId = searchParams.get("userId");

    const filter: Record<string, unknown> = {};
    if (taskId) filter.task = taskId;

    // Employees can only see their own entries
    if (authUser.role === "employee") {
      filter.user = authUser.userId;
    } else if (userId) {
      filter.user = userId;
    }

    const entries = await TimeEntry.find(filter)
      .populate("user", "name email")
      .populate("task", "title")
      .sort({ startTime: -1 });

    // Compute total seconds per user per task
    const summary: Record<string, { name: string; email: string; totalSeconds: number }> = {};
    for (const e of entries) {
      const u = e.user as { _id: { toString(): string }; name: string; email: string };
      const uid = u._id.toString();
      if (!summary[uid]) summary[uid] = { name: u.name, email: u.email, totalSeconds: 0 };
      if (e.duration) summary[uid].totalSeconds += e.duration;
      // If entry is still running, add elapsed
      if (e.status === "running" && !e.endTime) {
        summary[uid].totalSeconds += Math.floor(
          (Date.now() - e.startTime.getTime()) / 1000
        );
      }
    }

    return NextResponse.json({ entries, summary: Object.values(summary) });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
