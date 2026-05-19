import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DailyLog from "@/lib/models/DailyLog";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const today = new Date().toISOString().slice(0, 10);
    const log = await DailyLog.findOne({ user: authUser.userId, date: today });

    return NextResponse.json({ log: log ?? null });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
