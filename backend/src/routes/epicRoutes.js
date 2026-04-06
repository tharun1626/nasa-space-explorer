import express from "express";
import axios from "axios";

const router = express.Router();
const BASE_TIMEOUT_MS = Number(process.env.NASA_TIMEOUT_MS || 30000);

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
  return `https://epic.gsfc.nasa.gov/archive/${collection}/${yyyy}/${mm}/${dd}/png/${image}.png`;
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
  const base = `https://epic.gsfc.nasa.gov/api/${collection}`;
  const url = date ? `${base}/date/${date}` : base;

  const response = await nasaGetWithRetry(url, {
    params: { api_key: apiKey },
    validateStatus: () => true,
  });

  if (response.status >= 400) {
    return res.status(response.status).json({
      message: "Failed to fetch EPIC feed",
      nasa_status: response.status,
      details: response.data,
      used_params: { date, collection },
    });
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
    }),
  }));

  return res.json({
    collection,
    date: date || mapped[0]?.date?.slice(0, 10) || null,
    count: mapped.length,
    results: mapped,
  });
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
    return res.status(status).json({
      message: isTimeout
        ? "Failed to fetch Earth/EPIC data (NASA timeout, please retry)"
        : "Failed to fetch Earth/EPIC data",
      nasa_status: status,
      details,
    });
  }
});

export default router;
