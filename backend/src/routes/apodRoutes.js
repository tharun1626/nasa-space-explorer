import express from "express";
import axios from "axios";
import { logger } from "../utils/logger.js";

const router = express.Router();
const BASE_TIMEOUT_MS = Number(process.env.NASA_TIMEOUT_MS || 30000);
const RETRIES = Number(process.env.NASA_RETRIES || 2);
const apodCache = new Map();

async function nasaGetWithRetry(url, options = {}, retries = RETRIES, onRetry = null) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await axios.get(url, {
        timeout: BASE_TIMEOUT_MS + attempt * 5000,
        ...options,
      });
    } catch (error) {
      lastError = error;
      const isTimeout =
        error?.code === "ECONNABORTED" ||
        String(error?.message || "").toLowerCase().includes("timeout");
      if (!isTimeout || attempt === retries) break;
      const delayMs = 350 * (attempt + 1);
      if (typeof onRetry === "function") {
        onRetry({ attempt: attempt + 1, retries, delayMs, error });
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function toIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : null;
}

function cacheKey(params) {
  return JSON.stringify({
    date: params.date || null,
    start_date: params.start_date || null,
    end_date: params.end_date || null,
    count: params.count || null,
    thumbs: params.thumbs || false,
  });
}

function fallbackPayload(cached, reason) {
  if (Array.isArray(cached)) return cached;
  return {
    ...cached,
    fallback: true,
    fallback_reason: reason,
  };
}

router.get("/", async (req, res) => {
  try {
    const { date, startDate, endDate, count, thumbs } = req.query;
    const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
    logger.info("apod_request_received", {
      requestId: req.requestId,
      query: { date, startDate, endDate, count, thumbs },
    });

    const singleDate = toIsoDate(date);
    const start = toIsoDate(startDate);
    const end = toIsoDate(endDate);

    if (date && !singleDate) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }
    if (startDate && !start) {
      return res.status(400).json({ message: "Invalid startDate format. Use YYYY-MM-DD." });
    }
    if (endDate && !end) {
      return res.status(400).json({ message: "Invalid endDate format. Use YYYY-MM-DD." });
    }
    if (start && end && start > end) {
      return res.status(400).json({ message: "startDate cannot be after endDate." });
    }

    const params = { api_key: apiKey };
    if (singleDate) params.date = singleDate;
    if (start) params.start_date = start;
    if (end) params.end_date = end;
    if (count) params.count = Number(count);
    if (thumbs !== undefined) params.thumbs = String(thumbs).toLowerCase() === "true";

    const queryKey = cacheKey(params);
    const safeParams = {
      ...params,
      api_key: apiKey === "DEMO_KEY" ? "DEMO_KEY" : "(hidden)",
    };
    logger.info("apod_upstream_request_started", {
      requestId: req.requestId,
      params: safeParams,
      baseTimeoutMs: BASE_TIMEOUT_MS,
      retries: RETRIES,
    });

    const response = await nasaGetWithRetry("https://api.nasa.gov/planetary/apod", {
      params,
      validateStatus: () => true,
    }, RETRIES, ({ attempt, retries, delayMs, error }) => {
      logger.warn("apod_upstream_retry_scheduled", {
        requestId: req.requestId,
        attempt,
        totalRetries: retries,
        delayMs,
        reason: error?.code || error?.message || "timeout",
      });
    });

    if (response.status >= 400) {
      const upstreamMsg = String(response.data?.msg || response.data?.error?.message || "").toLowerCase();
      const canTryLatest = Boolean(singleDate) && response.status === 400 && upstreamMsg.includes("date must be between");
      if (canTryLatest) {
        logger.warn("apod_requested_date_unavailable_trying_latest", {
          requestId: req.requestId,
          requestedDate: singleDate,
          nasaStatus: response.status,
        });
        const latestResponse = await nasaGetWithRetry("https://api.nasa.gov/planetary/apod", {
          params: { api_key: apiKey, thumbs: params.thumbs },
          validateStatus: () => true,
        });
        if (latestResponse.status < 400) {
          apodCache.set("latest", latestResponse.data);
          logger.info("apod_latest_fallback_succeeded", {
            requestId: req.requestId,
            requestedDate: singleDate,
            fallbackDate: latestResponse.data?.date || null,
          });
          return res.json({
            ...latestResponse.data,
            fallback: true,
            fallback_reason: `APOD is not yet available for ${singleDate}. Showing latest published entry.`,
          });
        }
      }

      const cached = apodCache.get(queryKey) || apodCache.get("latest");
      if (cached) {
        logger.warn("apod_fallback_cache_served", {
          requestId: req.requestId,
          nasaStatus: response.status,
          cacheKey: queryKey,
        });
        return res.json(fallbackPayload(cached, "Serving cached APOD due to upstream NASA failure."));
      }
      logger.error("apod_upstream_failed_without_cache", {
        requestId: req.requestId,
        nasaStatus: response.status,
        details: response.data,
      });
      return res.status(response.status).json({
        message: response.data?.msg || "Failed to fetch APOD data",
        nasa_status: response.status,
        details: response.data,
      });
    }

    apodCache.set(queryKey, response.data);
    if (!Array.isArray(response.data)) apodCache.set("latest", response.data);

    res.set("Cache-Control", "no-store");
    logger.info("apod_request_succeeded", {
      requestId: req.requestId,
      nasaStatus: response.status,
      resultCount: Array.isArray(response.data) ? response.data.length : 1,
      date: singleDate || null,
      startDate: start || null,
      endDate: end || null,
      fallback: false,
    });
    return res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const isTimeout =
      error?.code === "ECONNABORTED" ||
      String(error?.message || "").toLowerCase().includes("timeout");
    const cached = apodCache.get("latest");
    if (cached) {
      logger.warn("apod_error_fallback_cache_served", {
        requestId: req.requestId,
        nasaStatus: status,
        timeout: isTimeout,
        error: error?.message,
      });
      return res.json(
        fallbackPayload(
          cached,
          isTimeout
            ? "Serving cached APOD because NASA request timed out."
            : "Serving cached APOD due to upstream NASA error."
        )
      );
    }

    logger.error("apod_request_failed", {
      requestId: req.requestId,
      nasaStatus: status,
      timeout: isTimeout,
      error: error?.message,
      details: error.response?.data,
    });
    return res.status(status).json({
      message: isTimeout
        ? "Failed to fetch APOD data (NASA timeout, please retry)"
        : "Failed to fetch APOD data",
      nasa_status: status,
      details: error.response?.data || error.message,
    });
  }
});

export default router;
