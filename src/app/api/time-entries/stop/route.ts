import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TimeEntry from "@/lib/models/TimeEntry";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { taskId } = await req.json();

    const running = await TimeEntry.findOne({
      task: taskId,
      user: authUser.userId,
      status: "running",
    });

    if (!running) {
      return NextResponse.json({ error: "No running timer found" }, { status: 404 });
    }

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - running.startTime.getTime()) / 1000
    );

    running.endTime = endTime;
    running.duration = duration;
    running.status = "stopped";
    await running.save();

    return NextResponse.json({ entry: running });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
