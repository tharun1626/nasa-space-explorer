import express from "express";
import axios from "axios";

const router = express.Router();
const ROVERS = ["curiosity", "perseverance", "opportunity", "spirit"];

function normalizePhoto(photo) {
  return {
    id: photo.id,
    sol: photo.sol,
    img_src: photo.img_src,
    earth_date: photo.earth_date,
    camera: photo.camera,
    rover: photo.rover,
  };
}

async function getLibraryFallbackPhotos(rover, limit = 60) {
  const response = await axios.get("https://images-api.nasa.gov/search", {
    params: {
      q: `${rover} mars rover`,
      media_type: "image",
      page: 1,
    },
    timeout: 20000,
    validateStatus: () => true,
  });

  const items = response.data?.collection?.items || [];
  return items
    .map((item, idx) => {
      const data = item?.data?.[0] || {};
      const link = item?.links?.[0] || {};
      if (!link?.href) return null;
      return {
        id: data.nasa_id || `${rover}-lib-${idx}`,
        sol: null,
        img_src: link.href,
        earth_date: (data.date_created || "").slice(0, 10) || null,
        camera: {
          name: "archive",
          full_name: data.title || "NASA Image Library",
        },
        rover: {
          name: rover[0].toUpperCase() + rover.slice(1),
          status: "archive",
        },
      };
    })
    .filter(Boolean)
    .slice(0, limit);
}

async function getLatestPhotosForRover(rover, apiKey, camera) {
  const params = { api_key: apiKey };
  if (camera) params.camera = camera;

  const latestUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos`;
  const latestRes = await axios.get(latestUrl, { params, timeout: 20000, validateStatus: () => true });
  const latestPhotos = Array.isArray(latestRes.data?.latest_photos) ? latestRes.data.latest_photos : [];
  if (latestRes.status < 400 && latestPhotos.length) {
    return latestPhotos.map(normalizePhoto);
  }

  const manifestUrl = `https://api.nasa.gov/mars-photos/api/v1/manifests/${rover}`;
  const manifestRes = await axios.get(manifestUrl, {
    params: { api_key: apiKey },
    timeout: 20000,
    validateStatus: () => true,
  });
  const maxDate = manifestRes.data?.photo_manifest?.max_date;
  if (!maxDate) return [];

  const photosUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos`;
  const photosRes = await axios.get(photosUrl, {
    params: { api_key: apiKey, earth_date: maxDate, ...(camera ? { camera } : {}) },
    timeout: 20000,
    validateStatus: () => true,
  });

  const photos = Array.isArray(photosRes.data?.photos) ? photosRes.data.photos : [];
  return photos.map(normalizePhoto);
}

router.get("/gallery", async (req, res) => {
  const roverQuery = String(req.query.rover || "all").toLowerCase();
  const camera = String(req.query.camera || "").trim().toLowerCase();
  const limit = Math.min(300, Math.max(24, Number(req.query.limit || 120)));
  const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";

  const rovers = roverQuery === "all" ? ROVERS : [roverQuery];
  if (rovers.some((r) => !ROVERS.includes(r))) {
    return res.status(400).json({
      message: "Invalid rover. Use all, curiosity, perseverance, opportunity, or spirit.",
    });
  }

  try {
    const batches = await Promise.all(
      rovers.map((rover) =>
        getLatestPhotosForRover(rover, apiKey, camera).catch(() => [])
      )
    );

    const merged = batches.flat();
    const byId = new Map();
    for (const photo of merged) {
      if (!byId.has(photo.id)) byId.set(photo.id, photo);
    }

    const photos = [...byId.values()]
      .sort((a, b) => (a.earth_date < b.earth_date ? 1 : -1))
      .slice(0, limit);

    if (!photos.length) {
      const fallbackBatches = await Promise.all(
        rovers.map((r) => getLibraryFallbackPhotos(r, Math.ceil(limit / Math.max(1, rovers.length))).catch(() => []))
      );
      const fallbackPhotos = fallbackBatches.flat().slice(0, limit);
      if (fallbackPhotos.length) {
        const fallbackCounts = fallbackPhotos.reduce((acc, p) => {
          const key = String(p?.rover?.name || "unknown").toLowerCase();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        return res.json({
          rover: roverQuery,
          camera: camera || null,
          total: fallbackPhotos.length,
          countsByRover: fallbackCounts,
          photos: fallbackPhotos,
          fallback: true,
          fallback_reason: "Mars Rover API returned no images. Showing NASA Image Library rover imagery.",
        });
      }

      return res.status(404).json({
        message: "No Mars images available from NASA for current query.",
      });
    }

    const countsByRover = photos.reduce((acc, p) => {
      const key = p?.rover?.name?.toLowerCase() || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      rover: roverQuery,
      camera: camera || null,
      total: photos.length,
      countsByRover,
      photos,
    });
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json({
      message: "Failed to fetch Mars gallery",
      nasa_status: status,
      details: error.response?.data || error.message,
    });
  }
});

router.get("/", async (req, res) => {
  const rover = (req.query.rover || "curiosity").toLowerCase();
  const earthDate = req.query.earthDate || "";
  const sol = req.query.sol || "";
  const camera = req.query.camera || "";

  const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";

  const allowedRovers = new Set(["curiosity", "opportunity", "spirit", "perseverance"]);
  if (!allowedRovers.has(rover)) {
    return res.status(400).json({
      message: "Invalid rover. Use curiosity, opportunity, spirit, or perseverance."
    });
  }

  try {
    const params = { api_key: apiKey };
    if (camera) params.camera = camera;

    if (sol) {
      params.sol = sol;
    } else if (earthDate) {
      params.earth_date = earthDate;
    } else {
      params.earth_date = "2015-06-03";
    }

    const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos`;
    let response = await axios.get(url, { params, timeout: 15000 });

    let data = response.data;

    if (Array.isArray(data?.photos) && data.photos.length === 0) {
      const manifestUrl = `https://api.nasa.gov/mars-photos/api/v1/manifests/${rover}`;
      const manifestRes = await axios.get(manifestUrl, {
        params: { api_key: apiKey },
        timeout: 15000,
      });
      const maxDate = manifestRes.data?.photo_manifest?.max_date;

      if (maxDate) {
        const fallbackParams = { api_key: apiKey, earth_date: maxDate };
        response = await axios.get(url, { params: fallbackParams, timeout: 15000 });
        data = response.data;

        if (Array.isArray(data?.photos) && data.photos.length > 0) {
          return res.json({
            ...data,
            fallback: true,
            fallback_reason: `No photos for requested parameters. Showing latest available date for ${rover}: ${maxDate}.`,
            requested_params: params,
            used_params: fallbackParams,
          });
        }
      }

      const libraryFallback = await getLibraryFallbackPhotos(rover, 80).catch(() => []);
      if (libraryFallback.length) {
        return res.json({
          photos: libraryFallback,
          fallback: true,
          fallback_reason: "No rover photos for query. Showing NASA Image Library rover imagery.",
          used_params: params,
        });
      }

      return res.status(404).json({
        message: "No Mars photos found for the given parameters.",
        hint: "Try a different date or use sol. Example: /api/mars?rover=perseverance&sol=100",
        used_params: params
      });
    }

    return res.json(data);
  } catch (error) {
    const status = error.response?.status || 500;
    const details = error.response?.data || error.message;

    console.error("Mars photos fetch failed:", status, details);

    if (status === 404) {
      const libraryFallback = await getLibraryFallbackPhotos(rover, 80).catch(() => []);
      if (libraryFallback.length) {
        return res.json({
          photos: libraryFallback,
          fallback: true,
          fallback_reason: "Rover API unavailable. Showing NASA Image Library rover imagery.",
        });
      }
      return res.status(404).json({
        message: "No Mars photos found for the given parameters.",
        hint: "Try /api/mars?rover=curiosity&earthDate=2015-06-03 or /api/mars?rover=perseverance&sol=100",
        nasa_status: status,
        details
      });
    }

    return res.status(status).json({
      message: "Failed to fetch Mars photos",
      nasa_status: status,
      details
    });
  }
});

export default router;
