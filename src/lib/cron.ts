
import cron from "node-cron";
import connectDB from "./db";
import DailyLog from "./models/DailyLog";

const globalForCron = global as typeof globalThis & { cronRegistered?: boolean };

if (!globalForCron.cronRegistered) {
  globalForCron.cronRegistered = true;

  console.log("[cron] Registering cron job...");

cron.schedule("59 23 * * *", async () => {

    console.log(`[cron] Fired at: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);

    try {
      await connectDB();
    } catch (err) {
      console.error(`[cron] ❌ DB connection failed:`, err);
      return;
    }

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const endTime = new Date(`${today}T18:29:59.000Z`);

    let logs;
    try {
      logs = await DailyLog.find({
        date: today,
        status: { $in: ["active", "paused"] },
      });

      if (logs.length === 0) {
        console.log(`[cron] No active logs found for ${today}`);
        return;
      }
    } catch (err) {
      console.error(`[cron] ❌ Failed to fetch logs:`, err);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const log of logs) {
      try {
        if (log.pausedAt) {
          const pausedSeconds = Math.floor(
            (endTime.getTime() - log.pausedAt.getTime()) / 1000
          );
          log.totalPausedSeconds = (log.totalPausedSeconds ?? 0) + pausedSeconds;
          log.pausedAt = undefined;
        }
        log.endTime = endTime;
        log.status = "completed";
        await log.save();
        successCount++;
      } catch (err) {
        failCount++;
        console.error(`[cron] ❌ Failed to update log ${log._id}:`, err);
      }
    }

    console.log(`[cron] ✅ Done — Success: ${successCount}, Failed: ${failCount}`);

  }, {
    timezone: "Asia/Kolkata"
  });

  console.log("[cron] Cron job registered successfully");

} else {
  console.log("[cron] Cron already registered — skipping");
}