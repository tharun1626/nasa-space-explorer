import express from "express";
import axios from "axios";

const router = express.Router();

// Examples:
// /api/mars?rover=curiosity&earthDate=2015-06-03
// /api/mars?rover=perseverance&sol=100
// /api/mars?rover=curiosity&earthDate=2015-06-03&camera=FHAZ
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
      // Safe default that historically returns results for Curiosity
      params.earth_date = "2015-06-03";
    }

    const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos`;
    console.log("Mars API request:", url, params);
    const response = await axios.get(url, { params, timeout: 15000 });

    const data = response.data;

    // NASA often returns 200 with empty photos array when there are no images.
    if (Array.isArray(data?.photos) && data.photos.length === 0) {
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

    // If NASA returns 404, treat it as 'no photos found' for the chosen parameters.
    if (status === 404) {
      return res.status(404).json({
        message: "No Mars photos found for the given parameters.",
        hint: "Try /api/mars?rover=curiosity&earthDate=2015-06-03 or /api/mars?rover=perseverance&sol=100",
        nasa_status: status,
        requested_url: url,
        response_url: error.request?.res?.responseUrl || null,
        used_params: { api_key: "(hidden)", ...Object.fromEntries(Object.entries(params).filter(([k]) => k !== "api_key")) },
        details
      });
    }

    return res.status(status).json({
      message: "Failed to fetch Mars photos",
      nasa_status: status,
      requested_url: url,
      response_url: error.request?.res?.responseUrl || null,
      used_params: { api_key: "(hidden)", ...Object.fromEntries(Object.entries(params).filter(([k]) => k !== "api_key")) },
      details
    });
  }
});

export default router;