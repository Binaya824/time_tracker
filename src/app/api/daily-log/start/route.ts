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

    const existing = await DailyLog.findOne({ user: authUser.userId, date: today });
    if (existing) return NextResponse.json({ log: existing });

    const log = await DailyLog.create({
      user: authUser.userId,
      date: today,
      startTime: new Date(),
      status: "active",
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
