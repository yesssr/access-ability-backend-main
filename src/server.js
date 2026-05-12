import app from "./app.js";
import "./config/db.js";
import { env } from "./config/env.js";
import { cleanupOldInactiveTokens } from "./services/push.service.js";

const PORT = env.port || 3000;

app.listen(PORT, () => {
  console.log(`Server running on :${PORT}`);
  
  // Setup background job: cleanup old inactive device tokens daily
  const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  const RETENTION_DAYS = 30;
  
  const scheduleCleanup = () => {
    setInterval(async () => {
      try {
        const result = await cleanupOldInactiveTokens(RETENTION_DAYS);
        console.log(`[Background Job] Device token cleanup completed. Deleted: ${result.deleted} tokens older than ${RETENTION_DAYS} days`);
      } catch (err) {
        console.error(`[Background Job] Device token cleanup failed:`, err.message);
      }
    }, CLEANUP_INTERVAL_MS);
    
    console.log(`[Background Job] Device token cleanup scheduled every 24 hours (retention: ${RETENTION_DAYS} days)`);
  };
  
  if (env.nodeEnv !== "test") {
    scheduleCleanup();
  }
});
