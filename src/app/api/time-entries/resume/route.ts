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

    //  Check already running
    const alreadyRunning = await TimeEntry.findOne({
      task: taskId,
      user: authUser.userId,
      status: "running",
    });
    if (alreadyRunning) {
      return NextResponse.json({ error: "Timer already running" }, { status: 409 });
    }

    //  paused entry
    const paused = await TimeEntry.findOne({
      task: taskId,
      user: authUser.userId,
      status: "paused",
    }).sort({ createdAt: -1 });

    if (!paused) {
      return NextResponse.json({ error: "No paused timer found" }, { status: 404 });
    }

    //   Create new running entry (paused entry keeps its duration)
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