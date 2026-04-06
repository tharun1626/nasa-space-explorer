import axios from "axios";
import { env } from "../config/env.js";

const nasa = axios.create({
  baseURL: "https://api.nasa.gov",
  timeout: 15000
});

export const getApod = async () => {
  const { data } = await nasa.get("/planetary/apod", {
    params: { api_key: env.nasaApiKey }
  });
  return data;
};

export const getNeoFeed = async (startDate, endDate) => {
  const { data } = await nasa.get("/neo/rest/v1/feed", {
    params: {
      start_date: startDate,
      end_date: endDate,
      api_key: env.nasaApiKey
    }
  });
  return data;
};

export const getMarsPhotos = async (rover, earthDate, camera) => {
  const { data } = await nasa.get(`/mars-photos/api/v1/rovers/${rover}/photos`, {
    params: {
      earth_date: earthDate,
      camera,
      api_key: env.nasaApiKey
    }
  });
  return data;
};

export const getEpicImages = async () => {
  const { data } = await nasa.get("/EPIC/api/natural/images", {
    params: { api_key: env.nasaApiKey }
  });
  return data;
};

export const searchNasaMedia = async (query) => {
  const { data } = await axios.get("https://images-api.nasa.gov/search", {
    params: { q: query, media_type: "image,video" },
    timeout: 15000
  });
  return data;
};