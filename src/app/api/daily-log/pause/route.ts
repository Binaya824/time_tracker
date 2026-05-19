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

    if (!log || log.status !== "active") {
      return NextResponse.json({ error: "No active log to pause" }, { status: 400 });
    }

    log.status = "paused";
    log.pausedAt = new Date();
    await log.save();

    return NextResponse.json({ log });
  } catch (err) {
    console.error("[daily-log/pause]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
