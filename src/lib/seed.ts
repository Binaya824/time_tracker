import connectDB from "./db";
import User from "./models/User";

export async function seedDefaultAdmin() {
  try {
    await connectDB();
    const exists = await User.findOne({ role: "admin" });
    if (!exists) {
      await User.create({
        name: "Super Admin",
        email: "admin@timetracker.com",
        password: "Admin@123",
        role: "admin",
      });
      console.log("Default admin created: admin@timetracker.com / Admin@123");
    }
  } catch (err) {
    console.error("Seed error:", err);
  }
}
