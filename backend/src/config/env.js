import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  nasaApiKey: process.env.NASA_API_KEY || "DEMO_KEY"
};