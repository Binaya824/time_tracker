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

    if (!log || log.status !== "paused") {
      return NextResponse.json({ error: "No paused log to resume" }, { status: 400 });
    }

    if (log.pausedAt) {
      const pausedSeconds = Math.floor((Date.now() - log.pausedAt.getTime()) / 1000);
      log.totalPausedSeconds = (log.totalPausedSeconds ?? 0) + pausedSeconds;
    }

    log.status = "active";
    log.pausedAt = undefined;
    await log.save();

    return NextResponse.json({ log });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
