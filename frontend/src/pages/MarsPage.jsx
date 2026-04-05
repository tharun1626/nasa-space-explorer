import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader.jsx";
import LoadingSkeleton from "../components/ui/LoadingSkeleton.jsx";
import { fmtDate } from "../lib/format.js";

const roverOptions = ["all", "curiosity", "perseverance", "opportunity", "spirit"];
const fallbackRovers = ["curiosity", "perseverance", "opportunity", "spirit"];
const fallbackDates = {
  curiosity: "2015-06-03",
  perseverance: "2021-02-19",
  opportunity: "2004-01-26",
  spirit: "2004-01-06",
};

export default function MarsPage() {
  const [rover, setRover] = useState("all");
  const [camera, setCamera] = useState("");
  const [photos, setPhotos] = useState([]);
  const [countsByRover, setCountsByRover] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(null);
  const [source, setSource] = useState("");

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setErr("");
    setSource("");

    const limits = [220, 140, 80];
    for (const limit of limits) {
      try {
        const params = new URLSearchParams({ rover, limit: String(limit) });
        if (camera.trim()) params.set("camera", camera.trim().toLowerCase());

        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/mars/gallery?${params.toString()}`);
        const json = await res.json();
        const list = Array.isArray(json?.photos) ? json.photos : [];
        if (res.ok && list.length) {
          setPhotos(list);
          setCountsByRover(json?.countsByRover || {});
          setSelected(null);
          setSource(`NASA Mars Gallery • ${json.total} images loaded`);
          setLoading(false);
          return;
        }
      } catch {
        continue;
      }
    }

    const legacyRovers = rover === "all" ? fallbackRovers : [rover];
    const legacyMap = new Map();
    const counts = {};
    for (const item of legacyRovers) {
      try {
        const params = new URLSearchParams({ rover: item, earthDate: fallbackDates[item] });
        if (camera.trim()) params.set("camera", camera.trim().toLowerCase());
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/mars?${params.toString()}`);
        const json = await res.json();
        const list = Array.isArray(json?.photos) ? json.photos : [];
        for (const p of list) {
          if (!legacyMap.has(p.id)) legacyMap.set(p.id, p);
        }
        if (list.length) counts[item] = list.length;
      } catch {
        continue;
      }
    }

    const legacyPhotos = [...legacyMap.values()]
      .sort((a, b) => (a.earth_date < b.earth_date ? 1 : -1))
      .slice(0, 120);
    if (legacyPhotos.length) {
      setPhotos(legacyPhotos);
      setCountsByRover(counts);
      setSelected(null);
      setSource("Legacy Mars feed fallback • loaded from /api/mars");
      setLoading(false);
      return;
    }

    try {
      const nasaRes = await fetch("https://images-api.nasa.gov/search?q=mars%20rover&media_type=image&page=1");
      const nasaJson = await nasaRes.json();
      const items = nasaJson?.collection?.items || [];
      const directPhotos = items
        .map((item, idx) => {
          const data = item?.data?.[0] || {};
          const link = item?.links?.[0] || {};
          if (!link?.href) return null;
          return {
            id: data?.nasa_id || `mars-lib-${idx}`,
            sol: null,
            img_src: link.href,
            earth_date: (data?.date_created || "").slice(0, 10) || null,
            camera: {
              name: "archive",
              full_name: data?.title || "NASA Image Library",
            },
            rover: {
              name: "Mars Archive",
              status: "archive",
            },
          };
        })
        .filter(Boolean)
        .slice(0, 120);

      if (directPhotos.length) {
        setPhotos(directPhotos);
        setCountsByRover({ archive: directPhotos.length });
        setSelected(null);
        setSource("Emergency fallback • direct NASA Image Library feed");
        setLoading(false);
        return;
      }
    } catch {
      // keep final user-facing error below
    }

    setPhotos([]);
    setSelected(null);
    setErr("Mars images are unavailable from NASA right now. Try again shortly.");
    setLoading(false);
  }, [rover, camera]);

  useEffect(() => {
    const id = setTimeout(loadGallery, 0);
    return () => clearTimeout(id);
  }, [loadGallery]);

  const roverStats = useMemo(
    () =>
      Object.entries(countsByRover)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
    [countsByRover]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mars Rover Photos"
        title="Mars Mission Wall"
        subtitle="A large rover image stream from NASA. Click any frame for mission details."
        accent="amber"
      />

      <section className="panel p-4 md:p-5">
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
          <select className="field-input" value={rover} onChange={(e) => setRover(e.target.value)}>
            {roverOptions.map((item) => (
              <option key={item} value={item}>
                {item[0].toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
          <input
            className="field-input"
            value={camera}
            onChange={(e) => setCamera(e.target.value)}
            placeholder="Camera code (optional)"
          />
          <button type="button" className="button-primary h-11 px-6" onClick={loadGallery}>
            {loading ? "Loading..." : "Refresh Wall"}
          </button>
        </div>
        <p className="subtitle mt-3">{source || "Preparing Mars image wall..."}</p>
      </section>

      {roverStats.length ? (
        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {roverStats.map(([name, count]) => (
            <article key={name} className="panel p-4">
              <p className="eyebrow">{name}</p>
              <p className="stat-value">{count}</p>
              <p className="stat-hint">Images loaded</p>
            </article>
          ))}
        </section>
      ) : null}

      {err ? <div className="panel border-red-300/25 bg-red-500/10 p-4 text-red-100">{err}</div> : null}
      {loading ? <LoadingSkeleton rows={10} /> : null}

      {!loading && photos.length ? (
        <section className="mars-wall">
          {photos.map((photo, idx) => (
            <button
              key={`${photo.id}-${idx}`}
              type="button"
              className={`mars-tile ${idx % 7 === 0 ? "mars-tile-tall" : ""}`}
              onClick={() => setSelected(photo)}
            >
              <img src={photo.img_src} alt={`Mars ${photo.id}`} loading="lazy" />
              <span>#{photo.id}</span>
            </button>
          ))}
        </section>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm p-4 md:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto panel p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="chart-title">Mars Frame Detail</h3>
              <button type="button" className="chip" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            <div className="mt-4 grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
              <div className="panel p-3">
                <img src={selected.img_src} alt={`Mars ${selected.id}`} className="w-full max-h-[72vh] object-contain rounded-lg bg-slate-950" />
              </div>
              <div className="panel p-4">
                <div className="mini-stat"><span>Photo ID</span><strong>{selected.id}</strong></div>
                <div className="mini-stat"><span>Rover</span><strong>{selected?.rover?.name || "-"}</strong></div>
                <div className="mini-stat"><span>Mission Status</span><strong>{selected?.rover?.status || "-"}</strong></div>
                <div className="mini-stat"><span>Camera</span><strong>{selected?.camera?.full_name || "-"}</strong></div>
                <div className="mini-stat"><span>Earth Date</span><strong>{fmtDate(selected?.earth_date)}</strong></div>
                <div className="mini-stat"><span>Sol</span><strong>{selected?.sol ?? "-"}</strong></div>
                <a href={selected.img_src} target="_blank" rel="noreferrer" className="chip chip-active mt-3 inline-flex">
                  Open Full Resolution
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
