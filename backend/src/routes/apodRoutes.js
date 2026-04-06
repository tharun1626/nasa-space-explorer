import express from "express";
import axios from "axios";

const router = express.Router();

// GET /api/apod
router.get("/", async (req, res) => {
  try {
    const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";

    const response = await axios.get("https://api.nasa.gov/planetary/apod", {
      params: { api_key: apiKey },
      timeout: 15000
    });

    // prevent caching during dev
    res.set("Cache-Control", "no-store");

    return res.json(response.data);
  } catch (error) {
    console.error(
      "APOD fetch failed:",
      error.response?.status,
      error.response?.data || error.message
    );
    return res.status(500).json({ message: "Error fetching APOD" });
  }
});

export default router;