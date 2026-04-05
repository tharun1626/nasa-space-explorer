import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const q = req.query.q || "moon";
    const page = Number(req.query.page || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 36)));
    const date = req.query.date || "";
    const dateFrom = req.query.dateFrom || "";
    const dateTo = req.query.dateTo || "";
    const yearStart = req.query.yearStart || "";
    const yearEnd = req.query.yearEnd || "";

    const resolvedYearStart = yearStart || (dateFrom ? dateFrom.slice(0, 4) : date ? date.slice(0, 4) : "");
    const resolvedYearEnd = yearEnd || (dateTo ? dateTo.slice(0, 4) : date ? date.slice(0, 4) : "");

    const params = { q, media_type: "image", page };
    if (resolvedYearStart) params.year_start = resolvedYearStart;
    if (resolvedYearEnd) params.year_end = resolvedYearEnd;

    const response = await axios.get("https://images-api.nasa.gov/search", {
      params,
      timeout: 15000,
    });

    const items = response.data?.collection?.items || [];
    const mapped = items.map((it) => {
      const data = it.data?.[0] || {};
      const link = it.links?.[0] || {};
      return {
        title: data.title,
        description: data.description,
        date_created: data.date_created,
        image: link.href,
        nasa_id: data.nasa_id,
        photographer: data.photographer,
        center: data.center,
        location: data.location,
        media_type: data.media_type,
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        secondary_creator: data.secondary_creator,
        nasa_url: it.href,
      };
    });

    const filtered = mapped.filter((item) => {
      if (!date && !dateFrom && !dateTo) return true;
      if (!item.date_created) return false;
      const day = item.date_created.slice(0, 10);
      if (date) return day === date;
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });

    res.json({
      q,
      page,
      limit,
      filters: {
        date: date || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        yearStart: resolvedYearStart || null,
        yearEnd: resolvedYearEnd || null,
      },
      totalFetched: mapped.length,
      results: filtered.slice(0, limit),
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch media search" });
  }
});

export default router;
