import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { date, startDate, endDate, count, thumbs } = req.query;
    const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";

    const params = { api_key: apiKey };
    if (date) params.date = date;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (count) params.count = Number(count);
    if (thumbs !== undefined) params.thumbs = String(thumbs).toLowerCase() === "true";

    const response = await axios.get("https://api.nasa.gov/planetary/apod", {
      params,
      timeout: 15000
    });

    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Error fetching APOD" });
  }
});

export default router;
