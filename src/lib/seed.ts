import connectDB from "./db";
import User from "./models/User";

export async function seedDefaultAdmin() {
  try {
    await connectDB();
    const exists = await User.findOne({ role: "admin" });
    if (!exists) {
      const email = process.env.ADMIN_EMAIL || "admin@timetracker.com";
      const password = process.env.ADMIN_PASSWORD || "Admin@123";
      await User.create({
        name: "Super Admin",
        email,
        password,
        role: "admin",
      });
      console.log(`Default admin created: ${email}`);
    }
  } catch (err) {
    console.error("Seed error:", err);
  }
}
