import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }

    const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";

    const response = await axios.get("https://api.nasa.gov/neo/rest/v1/feed", {
      params: {
        start_date: startDate,
        end_date: endDate,
        api_key: apiKey
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to fetch NEO feed from NASA" });
  }
});

export default router;