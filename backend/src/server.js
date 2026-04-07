import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import mediaRoutes from "./routes/mediaRoutes.js";
import apodRoutes from "./routes/apodRoutes.js";
import neoRoutes from "./routes/neoRoutes.js";
import marsRoutes from "./routes/marsRoutes.js";
import epicRoutes from "./routes/epicRoutes.js";
import { logger } from "./utils/logger.js";
import { requestContext } from "./middleware/requestContext.js";

import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestContext);

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const meta = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    if (res.statusCode < 400) {
      logger.info("request_succeeded", meta);
    } else {
      logger.warn("request_completed_with_error", meta);
    }
  });
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🚀" });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "nasa-mission-control-backend" });
});

app.use("/api/apod", apodRoutes);
app.use("/api/neo", neoRoutes);
app.use("/api/mars", marsRoutes);
app.use("/api/epic", epicRoutes);
app.use("/api/earth", epicRoutes);
app.use("/api/media", mediaRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5001;

app.listen(PORT, () => {
  logger.info("server_started", {
    port: PORT,
    env: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",
  });
});
