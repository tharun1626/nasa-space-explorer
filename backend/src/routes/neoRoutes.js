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

function toDateUtc(iso) {
  return new Date(`${iso}T00:00:00Z`);
}

function toIso(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function mergeNeoResponses(chunks) {
  const mergedByDate = {};
  for (const chunk of chunks) {
    const byDate = chunk?.near_earth_objects || {};
    for (const [date, list] of Object.entries(byDate)) {
      const existing = mergedByDate[date] || [];
      const dedupe = new Map(existing.map((item) => [item.id, item]));
      for (const neo of list) dedupe.set(neo.id, neo);
      mergedByDate[date] = [...dedupe.values()];
    }
  }

  const elementCount = Object.values(mergedByDate).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return {
    links: chunks[0]?.links || {},
    element_count: elementCount,
    near_earth_objects: mergedByDate,
  };
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
    const start = toDateUtc(startDate);
    const end = toDateUtc(endDate);

    const chunks = [];
    let cursor = start;
    while (cursor <= end) {
      const chunkEnd = addDays(cursor, 6) <= end ? addDays(cursor, 6) : end;
      const response = await nasaGetWithRetry("https://api.nasa.gov/neo/rest/v1/feed", {
        params: {
          start_date: toIso(cursor),
          end_date: toIso(chunkEnd),
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

      chunks.push(response.data);
      cursor = addDays(chunkEnd, 1);
    }

    const payload = mergeNeoResponses(chunks);
    neoCache.set(key, payload);
    neoCache.set("latest", payload);

    return res.json(payload);
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
