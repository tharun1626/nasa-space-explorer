import { logger } from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  const status = err.response?.status || err.status || 500;
  const message =
    err.response?.data?.error?.message ||
    err.message ||
    "Internal server error";

  logger.error("request_failed", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    message,
    error: err,
  });

  res.status(status).json({ message });
};
