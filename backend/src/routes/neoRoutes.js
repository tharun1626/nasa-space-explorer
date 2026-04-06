import express from "express";
import axios from "axios";

const router = express.Router();

// /api/epic
router.get("/", async (req, res) => {
  try {
    const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";

    const response = await axios.get("https://api.nasa.gov/EPIC/api/natural/images", {
      params: { api_key: apiKey },
      timeout: 15000
    });

    // Prevent caching during development
    res.set("Cache-Control", "no-store");

    return res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const details = error.response?.data || error.message;

    console.error("EPIC fetch failed:", status, details);

    return res.status(status).json({
      message: "Failed to fetch EPIC data",
      nasa_status: status,
      details
    });
  }
});

export default router;