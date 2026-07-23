import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";

const app: Express = express();

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    logger.info(
      { method: req.method, path: req.path, statusCode: res.statusCode, durationMs: Date.now() - startedAt },
      "request completed",
    );
  });
  next();
});
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
  const clientDirectory = path.resolve(serverDirectory, "../../client/dist");
  app.use(express.static(clientDirectory));
  app.get("/{*path}", (_req, res) => res.sendFile(path.join(clientDirectory, "index.html")));
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
