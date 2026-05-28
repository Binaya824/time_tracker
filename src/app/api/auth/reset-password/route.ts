import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, newPassword /*, oldPassword */ } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Email and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    /* Old password verification — reserved for later
    const valid = await user.comparePassword(oldPassword);
    if (!valid) {
      return NextResponse.json(
        { error: "Old password is incorrect" },
        { status: 401 }
      );
    }
    */

    user.password = newPassword;
    await user.save();

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}