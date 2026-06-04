import cron from "node-cron";
import connectDB from "./db";
import DailyLog from "./models/DailyLog";

cron.schedule("59 23 * * *", async () => {

    // DB Connection error
    try {
        await connectDB();
    } catch (err) {
        console.error(`[cron] ❌ DB connection failed at ${new Date().toISOString()}:`, err);
        return;
    }

    // today and endTime here — use everywhere
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const endTime = new Date(`${today}T18:29:59.000Z`);

    // Fetch logs error
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
        console.error(`[cron] ❌ Failed to fetch logs at ${new Date().toISOString()}:`, err);
        return;
    }

    // Update logs error
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