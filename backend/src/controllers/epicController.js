import { getEpicImages } from "../services/nasaService.js";

export const fetchEpicImages = async (req, res, next) => {
  try {
    const data = await getEpicImages();
    res.json(data);
  } catch (error) {
    next(error);
  }
};