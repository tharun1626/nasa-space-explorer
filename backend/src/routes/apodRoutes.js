import express from "express";
import axios from "axios";

const router = express.Router();
const BASE_TIMEOUT_MS = Number(process.env.NASA_TIMEOUT_MS || 25000);
const apodCache = new Map();

async function nasaGetWithRetry(url, options = {}, retries = 1) {
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

function cacheKeyFromParams(params) {
  const key = {
    date: params.date || null,
    start_date: params.start_date || null,
    end_date: params.end_date || null,
    count: params.count || null,
    thumbs: params.thumbs || false,
  };
  return JSON.stringify(key);
}

function toIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : null;
}

function prevDay(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function isNoDataForDate(payload) {
  const msg = String(payload?.msg || payload?.error?.message || "").toLowerCase();
  return msg.includes("no data available for date");
}

function isRateLimit(payload) {
  const msg = String(payload?.msg || payload?.error?.message || "").toLowerCase();
  return msg.includes("rate limit") || msg.includes("too many requests");
}

function buildEmergencyApodFallback() {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  return {
    date: iso,
    title: "APOD Temporarily Unavailable",
    explanation:
      "NASA APOD is temporarily unavailable from the upstream gateway. This fallback record is served by the backend so the UI remains available. Please retry in a few minutes.",
    media_type: "video",
    url: "https://apod.nasa.gov/apod/astropix.html",
    service_version: "v1",
    fallback: true,
    fallback_reason: "NASA upstream gateway returned an error (502/503/504).",
  };
}

router.get("/", async (req, res) => {
  try {
    const { date, startDate, endDate, count, thumbs } = req.query;
    const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";

    const params = { api_key: apiKey };
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

    if (singleDate) params.date = singleDate;
    if (start) params.start_date = start;
    if (end) params.end_date = end;
    if (count) params.count = Number(count);
    if (thumbs !== undefined) params.thumbs = String(thumbs).toLowerCase() === "true";

    const initialParams = { ...params };
    const queryCacheKey = cacheKeyFromParams(initialParams);

    let response = await nasaGetWithRetry("https://api.nasa.gov/planetary/apod", {
      params,
      validateStatus: () => true,
    });

    if (response.status >= 400 && singleDate && isNoDataForDate(response.data)) {
      let fallbackDate = singleDate;
      for (let i = 0; i < 3; i += 1) {
        fallbackDate = prevDay(fallbackDate);
        const fallbackResponse = await nasaGetWithRetry("https://api.nasa.gov/planetary/apod", {
          params: { ...params, date: fallbackDate },
          validateStatus: () => true,
        });
        if (fallbackResponse.status < 400) {
          response = fallbackResponse;
          break;
        }
      }
    }

    if (response.status >= 400 && singleDate) {
      const latestResponse = await nasaGetWithRetry("https://api.nasa.gov/planetary/apod", {
        params: { ...params, date: undefined },
        validateStatus: () => true,
      });
      if (latestResponse.status < 400) {
        response = latestResponse;
      }
    }

    if (response.status >= 400 && params.api_key !== "DEMO_KEY") {
      const demoKeyResponse = await nasaGetWithRetry("https://api.nasa.gov/planetary/apod", {
        params: { ...params, api_key: "DEMO_KEY" },
        validateStatus: () => true,
      });
      if (demoKeyResponse.status < 400) {
        response = demoKeyResponse;
      }
    }

    if (response.status >= 400) {
      if ([502, 503, 504].includes(response.status)) {
        const cached = apodCache.get(queryCacheKey) || apodCache.get("latest");
        if (cached) {
          return res.json({
            ...cached,
            fallback: true,
            fallback_reason: "Serving cached APOD due to temporary NASA upstream outage.",
          });
        }
        return res.json(buildEmergencyApodFallback());
      }

      const rateLimited = response.status === 429 || isRateLimit(response.data);
      return res.status(response.status).json({
        message: rateLimited
          ? "NASA APOD rate limit reached for this API key. Retry later or use a different key."
          : response.data?.msg || "Failed to fetch APOD data",
        nasa_status: response.status,
        details: response.data,
      });
    }

    apodCache.set(queryCacheKey, response.data);
    if (!Array.isArray(response.data)) {
      apodCache.set("latest", response.data);
    }

    return res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const isTimeout =
      error?.code === "ECONNABORTED" ||
      String(error?.message || "").toLowerCase().includes("timeout");
    if ([502, 503, 504].includes(status)) {
      const cached = apodCache.get("latest");
      if (cached) {
        return res.json({
          ...cached,
          fallback: true,
          fallback_reason: "Serving cached APOD due to temporary NASA upstream outage.",
        });
      }
      return res.json(buildEmergencyApodFallback());
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
