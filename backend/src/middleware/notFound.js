import { logger } from "../utils/logger.js";

export const notFound = (req, res) => {
  logger.warn("route_not_found", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
  });
  res.status(404).json({ message: "Route not found" });
};
