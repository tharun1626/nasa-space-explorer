import express from "express";
import axios from "axios";

const router = express.Router();
const BASE_TIMEOUT_MS = Number(process.env.NASA_TIMEOUT_MS || 30000);
const epicCache = new Map();

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
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

function buildEpicImageUrl({ image, date, collection = "natural" }) {
  const [yyyy, mm, dd] = date.slice(0, 10).split("-");
  return `https://api.nasa.gov/EPIC/archive/${collection}/${yyyy}/${mm}/${dd}/png/${image}.png`;
}

function epicCacheKey({ date, collection }) {
  return `${collection}:${date || "latest"}`;
}

function emptyEpicPayload({ date, collection, reason }) {
  return {
    collection,
    date: date || null,
    requested_date: date || null,
    count: 0,
    results: [],
    fallback: true,
    fallback_reason: reason,
  };
}

async function fetchLibraryEarthFallback({ date, collection }) {
  const query = date ? `earth ${date}` : "earth dscovr epic";
  const response = await nasaGetWithRetry("https://images-api.nasa.gov/search", {
    params: {
      q: query,
      media_type: "image",
      page: 1,
    },
    validateStatus: () => true,
  });

  if (response.status >= 400) return null;

  const items = response.data?.collection?.items || [];
  const mapped = items
    .map((item, idx) => {
      const data = item?.data?.[0] || {};
      const link = item?.links?.[0] || {};
      if (!link?.href) return null;
      const fallbackDate = (data.date_created || date || new Date().toISOString()).slice(0, 10);
      return {
        identifier: data.nasa_id || `fallback-${idx}`,
        caption: data.title || "Earth fallback frame",
        date: fallbackDate,
        image: data.nasa_id || `fallback-${idx}`,
        centroid_coordinates: null,
        dscovr_j2000_position: null,
        lunar_j2000_position: null,
        sun_j2000_position: null,
        image_url: link.href,
      };
    })
    .filter(Boolean)
    .slice(0, 24);

  if (!mapped.length) return null;

  return {
    collection,
    date: mapped[0]?.date || date || null,
    requested_date: date || null,
    count: mapped.length,
    results: mapped,
    fallback: true,
    fallback_reason: "EPIC upstream unavailable. Showing NASA Earth archive imagery.",
  };
}

async function tryEpicFetchVariants({ date, collection, apiKey }) {
  const variants = [
    `https://api.nasa.gov/EPIC/api/${collection}${date ? `/date/${date}` : ""}`,
    `https://epic.gsfc.nasa.gov/api/${collection}${date ? `/date/${date}` : ""}`,
  ];

  let lastResponse = null;
  for (const url of variants) {
    const response = await nasaGetWithRetry(url, {
      params: { api_key: apiKey },
      validateStatus: () => true,
    });
    lastResponse = response;
    if (response.status < 400) {
      return response;
    }
  }
  return lastResponse;
}

async function fetchEarthImagery(req, res, apiKey) {
  const lat = req.query.lat ? Number(req.query.lat) : 53.3498;
  const lon = req.query.lon ? Number(req.query.lon) : -6.2603;
  const date = req.query.date || "2021-06-01";
  const dim = req.query.dim ? Number(req.query.dim) : undefined;

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ message: "lat and lon must be valid numbers" });
  }

  const params = { lat, lon, date, api_key: apiKey };
  if (dim !== undefined && !Number.isNaN(dim)) params.dim = dim;

  const response = await nasaGetWithRetry("https://api.nasa.gov/planetary/earth/imagery", {
    params,
    validateStatus: () => true,
  });

  if (response.status >= 400) {
    return res.status(response.status).json({
      message: "Failed to fetch Earth imagery",
      nasa_status: response.status,
      details: response.data,
      used_params: { lat, lon, date, dim },
    });
  }

  return res.json({ ...response.data, used_params: { lat, lon, date, dim } });
}

async function fetchEpicFeed(req, res, apiKey) {
  const date = req.query.date;
  const collection = req.query.collection === "enhanced" ? "enhanced" : "natural";
  const key = epicCacheKey({ date, collection });
  const latestKey = epicCacheKey({ date: null, collection });

  let response = await tryEpicFetchVariants({ date, collection, apiKey });

  if (response.status < 400 && date) {
    const isEmpty = Array.isArray(response.data) && response.data.length === 0;
    if (isEmpty) {
      const latestResponse = await tryEpicFetchVariants({ date: null, collection, apiKey });
      if (latestResponse?.status < 400 && Array.isArray(latestResponse.data) && latestResponse.data.length > 0) {
        response = latestResponse;
      }
    }
  }

  if (response.status >= 400) {
    const cached = epicCache.get(key) || epicCache.get(latestKey);
    if (cached) {
      return res.json({
        ...cached,
        fallback: true,
        fallback_reason: "Serving cached EPIC feed due to upstream NASA failure.",
      });
    }

    const libraryFallback = await fetchLibraryEarthFallback({ date, collection });
    if (libraryFallback) {
      epicCache.set(key, libraryFallback);
      epicCache.set(latestKey, libraryFallback);
      return res.json(libraryFallback);
    }

    return res.json(
      emptyEpicPayload({
        date,
        collection,
        reason: "EPIC upstream unavailable and no cached/library fallback found.",
      })
    );
  }

  const items = Array.isArray(response.data) ? response.data : [];
  const mapped = items.map((item) => ({
    identifier: item.identifier,
    caption: item.caption,
    date: item.date,
    image: item.image,
    centroid_coordinates: item.centroid_coordinates,
    dscovr_j2000_position: item.dscovr_j2000_position,
    lunar_j2000_position: item.lunar_j2000_position,
    sun_j2000_position: item.sun_j2000_position,
    image_url: buildEpicImageUrl({
      image: item.image,
      date: item.date,
      collection,
    }) + `?api_key=${encodeURIComponent(apiKey)}`,
  }));

  const payload = {
    collection,
    date: mapped[0]?.date?.slice(0, 10) || date || null,
    requested_date: date || null,
    count: mapped.length,
    results: mapped,
  };

  epicCache.set(key, payload);
  epicCache.set(latestKey, payload);

  return res.json(payload);
}

router.get("/", async (req, res) => {
  try {
    const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
    res.set("Cache-Control", "no-store");

    const mode = req.query.mode || "";
    const hasGeoQuery = req.query.lat !== undefined || req.query.lon !== undefined;
    if (mode === "imagery" || hasGeoQuery) {
      return await fetchEarthImagery(req, res, apiKey);
    }

    return await fetchEpicFeed(req, res, apiKey);
  } catch (error) {
    const status = error.response?.status || 500;
    const details = error.response?.data || error.message;
    const isTimeout =
      error?.code === "ECONNABORTED" ||
      String(error?.message || "").toLowerCase().includes("timeout");
    const fallback = epicCache.get(epicCacheKey({ date: req.query.date, collection: req.query.collection === "enhanced" ? "enhanced" : "natural" }))
      || epicCache.get(epicCacheKey({ date: null, collection: req.query.collection === "enhanced" ? "enhanced" : "natural" }));
    if (fallback) {
      return res.json({
        ...fallback,
        fallback: true,
        fallback_reason: isTimeout
          ? "Serving cached EPIC feed because NASA request timed out."
          : "Serving cached EPIC feed due to upstream NASA error.",
      });
    }

    const libraryFallback = await fetchLibraryEarthFallback({
      date: req.query.date,
      collection: req.query.collection === "enhanced" ? "enhanced" : "natural",
    });
    if (libraryFallback) {
      return res.json(libraryFallback);
    }

    return res.json(
      emptyEpicPayload({
        date: req.query.date,
        collection: req.query.collection === "enhanced" ? "enhanced" : "natural",
        reason: isTimeout
          ? "NASA EPIC timeout; returning safe empty payload."
          : "NASA EPIC error; returning safe empty payload.",
      })
    );
  }
});

export default router;
