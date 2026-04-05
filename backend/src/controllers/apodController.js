import { getApod } from "../services/nasaService.js";

export const fetchApod = async (req, res, next) => {
  try {
    const data = await getApod();
    res.json(data);
  } catch (error) {
    next(error);
  }
};