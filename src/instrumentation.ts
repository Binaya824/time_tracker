export async function register() {
  console.log("[instrumentation] NEXT_RUNTIME:", process.env.NEXT_RUNTIME);
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[instrumentation] Loading cron...");
    await import("./lib/cron");
    console.log("[instrumentation] Cron loaded ✅");
  }
}