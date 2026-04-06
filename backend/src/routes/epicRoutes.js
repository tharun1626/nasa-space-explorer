import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import indexRoutes from "./routes/indexRoutes.js";
import apodRoutes from "./routes/apodRoutes.js";
import neoRoutes from "./routes/neoRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import marsRoutes from "./routes/marsRoutes.js";
import earthRoutes from "./routes/epicRoutes.js"; // Earth imagery router

import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
app.disable("etag");

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🚀" });
});

// Routes
app.use("/", indexRoutes);
app.use("/api/apod", apodRoutes);
app.use("/api/neo", neoRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/mars", marsRoutes);

// Earth imagery (simple EPIC alternative)
app.use("/api/earth", earthRoutes);
// optional alias
app.use("/api/epic", earthRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});