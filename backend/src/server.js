import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import mediaRoutes from "./routes/mediaRoutes.js";
import apodRoutes from "./routes/apodRoutes.js";
import neoRoutes from "./routes/neoRoutes.js";
import marsRoutes from "./routes/marsRoutes.js";
import epicRoutes from "./routes/epicRoutes.js";

import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🚀" });
});

app.use("/api/apod", apodRoutes);
app.use("/api/neo", neoRoutes);
app.use("/api/mars", marsRoutes);
app.use("/api/epic", epicRoutes);
app.use("/api/earth", epicRoutes);
app.use("/api/media", mediaRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
