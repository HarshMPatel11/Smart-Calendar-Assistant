import { createServer } from "node:http";
import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { initializeRealtime } from "./services/realtimeService.js";

async function startServer(): Promise<void> {
  await connectDatabase();
  const server = createServer(app);
  initializeRealtime(server);
  server.listen(env.port, () => {
    logger.info({ port: env.port }, `API available at http://localhost:${env.port}/api`);
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, "Shutting down");
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

startServer().catch((error) => {
  logger.fatal({ err: error }, "Failed to start server");
  process.exit(1);
});
