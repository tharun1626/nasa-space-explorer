import express from "express";
import axios from "axios";

const router = express.Router();
const BASE_TIMEOUT_MS = Number(process.env.NASA_TIMEOUT_MS || 30000);
const RETRIES = Number(process.env.NASA_RETRIES || 2);
const apodCache = new Map();

async function nasaGetWithRetry(url, options = {}, retries = RETRIES) {
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
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
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

router.get("/", async (req, res) => {
  try {
    const { date, startDate, endDate, count, thumbs } = req.query;
    const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";

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
    const response = await nasaGetWithRetry("https://api.nasa.gov/planetary/apod", {
      params,
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      const cached = apodCache.get(queryKey) || apodCache.get("latest");
      if (cached) {
        return res.json({
          ...cached,
          fallback: true,
          fallback_reason: "Serving cached APOD due to upstream NASA failure.",
        });
      }
      return res.status(response.status).json({
        message: response.data?.msg || "Failed to fetch APOD data",
        nasa_status: response.status,
        details: response.data,
      });
    }

    apodCache.set(queryKey, response.data);
    if (!Array.isArray(response.data)) apodCache.set("latest", response.data);

    res.set("Cache-Control", "no-store");
    return res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const isTimeout =
      error?.code === "ECONNABORTED" ||
      String(error?.message || "").toLowerCase().includes("timeout");
    const cached = apodCache.get("latest");
    if (cached) {
      return res.json({
        ...cached,
        fallback: true,
        fallback_reason: isTimeout
          ? "Serving cached APOD because NASA request timed out."
          : "Serving cached APOD due to upstream NASA error.",
      });
    }

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
