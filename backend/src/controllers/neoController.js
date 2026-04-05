import { getNeoFeed } from "../services/nasaService.js";
import { transformNeoData } from "../utils/neoHelpers.js";

export const fetchNeoFeed = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }

    const raw = await getNeoFeed(startDate, endDate);
    const data = transformNeoData(raw);

    res.json(data);
  } catch (error) {
    next(error);
  }
};