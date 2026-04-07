import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../components/ui/PageHeader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import LoadingSkeleton from "../components/ui/LoadingSkeleton.jsx";
import TiltCard from "../components/ui/TiltCard.jsx";
import { fmtDate } from "../lib/format.js";

export default function EarthPage() {
  const prevModeRef = useRef(null);
  const [mode, setMode] = useState("epic");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lat, setLat] = useState("28.6139");
  const [lon, setLon] = useState("77.2090");
  const [dim, setDim] = useState("0.15");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [speedMs, setSpeedMs] = useState(900);
  const [fallbackNotice, setFallbackNotice] = useState("");

  const fetchEarth = useCallback(async ({ forceLatest = false } = {}) => {
    try {
      setErr("");
      setFallbackNotice("");
      setLoading(true);

      let url = `${import.meta.env.VITE_API_BASE_URL}/api/earth`;
      if (mode === "imagery") {
        url = `${import.meta.env.VITE_API_BASE_URL}/api/earth?mode=imagery&date=${date}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&dim=${encodeURIComponent(dim)}`;
      } else if (!forceLatest) {
        url = `${import.meta.env.VITE_API_BASE_URL}/api/earth?date=${date}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        if (mode === "epic") {
          const latestRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/earth`);
          const latestJson = await latestRes.json();
          if (latestRes.ok && (latestJson?.count || 0) > 0) {
            setData(latestJson);
            setDate((latestJson?.date || "").slice(0, 10) || date);
            setFallbackNotice(
              `EPIC request for ${fmtDate(date)} failed. Showing latest available frames instead.`
            );
            return;
          }

          setData({
            collection: "natural",
            date: date || null,
            requested_date: date || null,
            count: 0,
            results: [],
            fallback: true,
            fallback_reason: json?.message || "EPIC feed unavailable",
          });
          setFallbackNotice(
            `EPIC is temporarily unavailable for ${fmtDate(date)}. Please retry in a few minutes.`
          );
          return;
        }

        const nasaDetails =
          typeof json?.details === "string"
            ? json.details
            : json?.details?.msg || json?.details?.error || "";
        throw new Error(
          `${json?.message || "Failed to fetch Earth feed"}${nasaDetails ? `: ${nasaDetails}` : ""}`
        );
      }

      if (mode === "epic" && !forceLatest && (json?.count || 0) === 0) {
        const latestRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/earth`);
        const latestJson = await latestRes.json();
        if (latestRes.ok && (latestJson?.count || 0) > 0) {
          setData(latestJson);
          setDate((latestJson?.date || "").slice(0, 10) || date);
          setFallbackNotice(
            `No EPIC frames for ${fmtDate(date)}. Showing latest available frames instead.`
          );
          return;
        }
      }

      setData(json);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [mode, date, lat, lon, dim]);

  const epicResults = useMemo(() => data?.results || [], [data]);
  const activeFrame = epicResults[frameIndex] || null;

  useEffect(() => {
    setFrameIndex(0);
  }, [epicResults.length, date]);

  useEffect(() => {
    if (mode !== "epic" || !autoPlay || epicResults.length <= 1) return;
    const id = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % epicResults.length);
    }, speedMs);
    return () => clearInterval(id);
  }, [mode, autoPlay, speedMs, epicResults.length]);

  useEffect(() => {
    if (prevModeRef.current === mode) return;
    prevModeRef.current = mode;
    fetchEarth({ forceLatest: mode === "epic" });
  }, [mode, fetchEarth]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Blue Planet Explorer"
        title="Earth 3D Observatory"
        subtitle="View EPIC full-disk Earth frames and date-based Earth imagery, with immersive 3D motion styling."
        accent="amber"
      />

      <section className="panel p-5 reveal-up">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
          <button className={`chip h-11 ${mode === "epic" ? "chip-active" : ""}`} onClick={() => setMode("epic")}>
            EPIC Orbit Feed
          </button>
          <button className={`chip h-11 ${mode === "imagery" ? "chip-active" : ""}`} onClick={() => setMode("imagery")}>
            Earth Imagery
          </button>
          <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="field-input" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" />
          <input className="field-input" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="Longitude" />
        </div>
        {mode === "imagery" ? (
          <div className="mt-3 grid md:grid-cols-[1fr_auto] gap-3">
            <input className="field-input" value={dim} onChange={(e) => setDim(e.target.value)} placeholder="Dimension (0.025 - 0.25)" />
            <button className="button-primary h-11 px-6" onClick={fetchEarth}>
              {loading ? "Loading..." : "Fetch Earth"}
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <button className="button-primary h-11 px-6" onClick={fetchEarth}>
              {loading ? "Loading..." : "Fetch EPIC"}
            </button>
          </div>
        )}
      </section>

      {err ? <div className="panel border-red-300/25 bg-red-500/10 p-4 text-red-100">{err}</div> : null}
      {fallbackNotice ? (
        <div className="panel border-amber-300/25 bg-amber-500/10 p-4 text-amber-100">
          {fallbackNotice}
        </div>
      ) : null}
      {loading && !data ? <LoadingSkeleton rows={8} /> : null}

      <section className="grid lg:grid-cols-3 gap-4">
        <StatCard label="Mode" value={mode === "epic" ? "EPIC" : "Imagery"} hint="Current data source" tone="teal" />
        <StatCard label="Selected Date" value={fmtDate(date)} hint="Date filter" tone="neutral" />
        <StatCard
          label="Frames"
          value={mode === "epic" ? epicResults.length : data?.url ? 1 : 0}
          hint="Returned results"
          tone="violet"
        />
      </section>

      {mode === "epic" ? (
        <section className="panel p-5 reveal-up">
          <h3 className="chart-title">Real Earth Motion (NASA EPIC Frames)</h3>
          <p className="chart-subtitle">
            Playback is generated from real EPIC captures for the selected date.
          </p>

          {activeFrame ? (
            <>
              <div className="mt-4 rounded-2xl overflow-hidden border border-cyan-200/20 bg-black/40">
                <img
                  src={activeFrame.image_url}
                  alt={activeFrame.caption}
                  className="w-full max-h-[620px] object-contain bg-slate-950"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <button
                  className="chip"
                  onClick={() =>
                    setFrameIndex((prev) =>
                      prev === 0 ? epicResults.length - 1 : prev - 1
                    )
                  }
                >
                  Prev
                </button>
                <button className="chip" onClick={() => setAutoPlay((v) => !v)}>
                  {autoPlay ? "Pause" : "Play"}
                </button>
                <button
                  className="chip"
                  onClick={() => setFrameIndex((prev) => (prev + 1) % epicResults.length)}
                >
                  Next
                </button>

                <label className="text-xs text-slate-300/80 ml-1">Speed</label>
                <select
                  className="field-input h-10 !w-36"
                  value={speedMs}
                  onChange={(e) => setSpeedMs(Number(e.target.value))}
                >
                  <option value={1400}>Slow</option>
                  <option value={900}>Normal</option>
                  <option value={500}>Fast</option>
                </select>

                <span className="text-xs text-slate-300/80">
                  Frame {frameIndex + 1} / {epicResults.length}
                </span>
              </div>

              <p className="subtitle mt-3">
                Timestamp: {fmtDate(activeFrame.date)} • {activeFrame.caption}
              </p>
            </>
          ) : (
            <p className="subtitle mt-3">
              No EPIC frames loaded yet. Pick a date and click <strong>Fetch EPIC</strong>.
            </p>
          )}
        </section>
      ) : null}

      {mode === "imagery" && data?.url ? (
        <TiltCard>
          <article className="panel p-4 reveal-up">
            <img src={data.url} alt="Earth imagery" className="w-full rounded-xl max-h-[580px] object-cover" />
            <p className="subtitle mt-3">Earth imagery for {fmtDate(data?.used_params?.date)} at lat {data?.used_params?.lat}, lon {data?.used_params?.lon}</p>
          </article>
        </TiltCard>
      ) : null}

      {mode === "epic" && epicResults.length ? (
        <section className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {epicResults.map((item) => (
            <TiltCard key={item.identifier}>
              <article className="panel p-3 reveal-up">
                <img src={item.image_url} alt={item.caption} className="w-full h-52 object-cover rounded-lg" loading="lazy" />
                <h3 className="font-semibold text-slate-100 mt-3 clamp-2">{item.caption}</h3>
                <p className="text-xs text-slate-300/70 mt-1">{fmtDate(item.date)}</p>
              </article>
            </TiltCard>
          ))}
        </section>
      ) : null}
    </div>
  );
}
