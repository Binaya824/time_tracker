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

    // Make sure there is no running timer
    const running = await TimeEntry.findOne({
      task: taskId,
      user: authUser.userId,
      status: "running",
    });

    if (running) {
      return NextResponse.json({ error: "Timer is already running" }, { status: 409 });
    }

    // Create a fresh entry (resume = new session)
    const entry = await TimeEntry.create({
      task: taskId,
      user: authUser.userId,
      startTime: new Date(),
      status: "running",
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
