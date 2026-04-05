import { searchNasaMedia } from "../services/nasaService.js";

export const fetchMedia = async (req, res, next) => {
  try {
    const { q = "mars" } = req.query;
    const data = await searchNasaMedia(q);
    res.json(data);
  } catch (error) {
    next(error);
  }
};