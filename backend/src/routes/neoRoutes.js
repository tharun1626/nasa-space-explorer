import express from "express";
import axios from "axios";

const router = express.Router();
const BASE_TIMEOUT_MS = Number(process.env.NASA_TIMEOUT_MS || 30000);
const neoCache = new Map();

async function nasaGetWithRetry(url, options = {}, retries = 2) {
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

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function cacheKey(startDate, endDate) {
  return `${startDate}:${endDate}`;
}

router.get("/", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
      return res.status(400).json({ message: "startDate and endDate are required in YYYY-MM-DD format" });
    }
    if (startDate > endDate) {
      return res.status(400).json({ message: "startDate cannot be after endDate" });
    }

    const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
    const key = cacheKey(startDate, endDate);
    const response = await nasaGetWithRetry("https://api.nasa.gov/neo/rest/v1/feed", {
      params: {
        start_date: startDate,
        end_date: endDate,
        api_key: apiKey,
      },
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      const cached = neoCache.get(key) || neoCache.get("latest");
      if (cached) {
        return res.json({
          ...cached,
          fallback: true,
          fallback_reason: "Serving cached NEO feed due to upstream NASA failure.",
        });
      }
      return res.status(response.status).json({
        message: "Failed to fetch NEO data",
        nasa_status: response.status,
        details: response.data,
      });
    }

    neoCache.set(key, response.data);
    neoCache.set("latest", response.data);

    return res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const isTimeout =
      error?.code === "ECONNABORTED" ||
      String(error?.message || "").toLowerCase().includes("timeout");
    const cached = neoCache.get("latest");
    if (cached) {
      return res.json({
        ...cached,
        fallback: true,
        fallback_reason: isTimeout
          ? "Serving cached NEO feed because NASA request timed out."
          : "Serving cached NEO feed due to upstream NASA error.",
      });
    }

    return res.status(status).json({
      message: isTimeout
        ? "Failed to fetch NEO data (NASA timeout, please retry)"
        : "Failed to fetch NEO data",
      nasa_status: status,
      details: error.response?.data || error.message,
    });
  }
});

export default router;
