 import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DailyLog from "@/lib/models/DailyLog";
import { getAuthUser } from "@/lib/auth";

export async function POST() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const today = new Date().toISOString().slice(0, 10);

    const log = await DailyLog.findOne({ user: authUser.userId, date: today });
    if (!log) return NextResponse.json({ error: "No active log for today" }, { status: 404 });
    if (log.status === "completed") return NextResponse.json({ log });

    //   accumulate paused time if ending while paused
    if (log.pausedAt) {
      const pausedSeconds = Math.floor((Date.now() - log.pausedAt.getTime()) / 1000);
      log.totalPausedSeconds = (log.totalPausedSeconds ?? 0) + pausedSeconds;
      log.pausedAt = undefined;
    }

    log.endTime = new Date();
    log.status = "completed";
    await log.save();

    return NextResponse.json({ log });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}