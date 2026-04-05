import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../components/ui/PageHeader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import LoadingSkeleton from "../components/ui/LoadingSkeleton.jsx";
import ApodInsights from "../components/charts/ApodInsights.jsx";
import ApodRangeVisuals from "../components/charts/ApodRangeVisuals.jsx";
import TiltCard from "../components/ui/TiltCard.jsx";
import { fmtDate, readingTimeMinutes, wordsCount } from "../lib/format.js";

function getIsoOffset(days) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const API_BASES = API_BASE_URL ? [API_BASE_URL, ""] : [""];

function buildApiError(payload, status) {
  if (payload?.message) return payload.message;
  if (payload?.details?.msg) return payload.details.msg;
  if (payload?.details?.error?.message) return payload.details.error.message;
  if (payload?.error?.message) return payload.error.message;
  if (status === 0) return "Backend is unreachable. Start the backend server and retry.";
  return `Failed to load APOD data (status ${status}).`;
}

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function requestFromAnyBase(pathWithQuery) {
  let lastError = null;
  let firstMeaningfulError = null;
  for (const base of API_BASES) {
    const url = `${base}${pathWithQuery}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const json = parseJsonSafe(text);
      if (!res.ok) throw new Error(buildApiError(json, res.status));
      return json;
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || "");
      const looksInformative =
        msg.includes("NASA") ||
        msg.includes("status") ||
        msg.includes("rate limit") ||
        msg.includes("Invalid") ||
        msg.includes("Failed to fetch APOD");
      if (!firstMeaningfulError && looksInformative) {
        firstMeaningfulError = err;
      }
    }
  }
  throw firstMeaningfulError || lastError || new Error("Backend is unreachable. Start backend and retry.");
}

export default function ApodPage() {
  const prevModeRef = useRef(null);
  const [mode, setMode] = useState("single");
  const [date, setDate] = useState(getIsoOffset(-1));
  const [startDate, setStartDate] = useState(getIsoOffset(-7));
  const [endDate, setEndDate] = useState(getIsoOffset(-1));

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeRangeDate, setActiveRangeDate] = useState("");
  const [activeReadBand, setActiveReadBand] = useState("all");
  const [activeMediaType, setActiveMediaType] = useState("all");

  const fetchApod = useCallback(async ({ initial = false } = {}) => {
    try {
      setLoading(true);
      setErr("");
      let query = "/api/apod?thumbs=true";
      if (mode === "single") {
        if (!date) throw new Error("Please choose a valid date.");
        query += `&date=${encodeURIComponent(date)}`;
      } else {
        if (!startDate || !endDate) throw new Error("Please choose both start and end dates.");
        if (startDate > endDate) throw new Error("Start date cannot be after end date.");
        query += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }

      const json = await requestFromAnyBase(query);
      setData(json);
      if (mode === "range") {
        setActiveRangeDate("");
        setActiveReadBand("all");
        setActiveMediaType("all");
      }
    } catch (e) {
      const raw = e?.message || "Failed to load APOD data.";
      setErr(raw === "Failed to fetch" ? "Backend is unreachable. Start backend server on port 5001 and retry." : raw);
      if (initial) setData(null);
    } finally {
      setLoading(false);
    }
  }, [mode, date, startDate, endDate]);

  useEffect(() => {
    if (prevModeRef.current === mode) return;
    prevModeRef.current = mode;
    fetchApod({ initial: true });
  }, [mode, fetchApod]);

  const rangeItems = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return [...data].sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [data]);

  const current = useMemo(() => {
    if (Array.isArray(data)) return data[0] || null;
    return data;
  }, [data]);

  const summary = useMemo(() => {
    const base = mode === "range" ? rangeItems[0] : current;
    if (!base) return null;
    const text = base.explanation || "";
    return {
      words: wordsCount(text),
      readTime: readingTimeMinutes(text),
      date: fmtDate(base.date),
    };
  }, [mode, rangeItems, current]);

  const filteredRangeItems = useMemo(() => {
    return rangeItems.filter((item) => {
      if (activeRangeDate && item.date !== activeRangeDate) return false;
      if (activeMediaType !== "all" && item.media_type !== activeMediaType) return false;
      if (activeReadBand !== "all") {
        const words = wordsCount(item.explanation || "");
        const read = readingTimeMinutes(item.explanation || "");
        if (activeReadBand === "short" && read >= 3) return false;
        if (activeReadBand === "medium" && (read < 3 || read > 5)) return false;
        if (activeReadBand === "long" && read <= 5) return false;
        if (!words && activeReadBand !== "short") return false;
      }
      return true;
    });
  }, [rangeItems, activeRangeDate, activeReadBand, activeMediaType]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live Astronomy Feed"
        title="APOD Explorer + Narrative Analytics"
        subtitle="Search by day or date range, then inspect each APOD narrative with clear metrics and visualization."
        accent="amber"
      />

      <section className="panel p-5 reveal-up">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
          <button className={`chip h-11 ${mode === "single" ? "chip-active" : ""}`} onClick={() => setMode("single")}>
            Single Date
          </button>
          <button className={`chip h-11 ${mode === "range" ? "chip-active" : ""}`} onClick={() => setMode("range")}>
            Date Range
          </button>

          {mode === "single" ? (
            <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          ) : (
            <>
              <input className="field-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <input className="field-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </>
          )}

          <button className="button-primary h-11 px-6" onClick={() => fetchApod()}>
            {loading ? "Loading..." : "Fetch APOD"}
          </button>
        </div>
      </section>

      {err ? <div className="panel border-red-300/25 bg-red-500/10 p-4 text-red-100">{err}</div> : null}
      {loading && !data ? <LoadingSkeleton rows={8} /> : null}

      {summary ? (
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard label="Reference Date" value={summary.date} hint="Current highlighted APOD" tone="neutral" />
          <StatCard label="Narrative Size" value={`${summary.words} words`} hint="Text depth" tone="teal" />
          <StatCard label="Read Time" value={`${summary.readTime} min`} hint="Estimated reading" tone="violet" />
        </div>
      ) : null}

      {mode === "single" && current ? (
        <>
          <section className="grid xl:grid-cols-[1.25fr_1fr] gap-4">
            <TiltCard>
              <article className="panel overflow-hidden reveal-up">
                {current.media_type === "image" ? (
                  <img src={current.hdurl || current.url} alt={current.title} className="w-full max-h-[560px] object-cover" loading="eager" />
                ) : (
                  <div className="p-6">
                    <a className="button-primary" href={current.url} target="_blank" rel="noreferrer">
                      Open APOD Media
                    </a>
                  </div>
                )}
              </article>
            </TiltCard>

            <article className="panel p-6 reveal-up">
              <p className="eyebrow">Selected APOD</p>
              <h2 className="font-heading text-2xl mt-2">{current.title}</h2>
              <p className="subtitle mt-2">{fmtDate(current.date)}</p>
              <p className="subtitle mt-4 leading-7">{current.explanation}</p>
            </article>
          </section>

          <ApodInsights apod={current} />
        </>
      ) : null}

      {mode === "range" && rangeItems.length ? (
        <>
          <ApodRangeVisuals
            items={rangeItems}
            activeDate={activeRangeDate}
            onDateSelect={(value) => setActiveRangeDate((prev) => (prev === value ? "" : value))}
          />

          <section className="panel p-4 flex flex-wrap gap-2 items-center">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-300/70">Drill-Down Filters</p>
            <button
              type="button"
              className={`chip ${activeReadBand === "short" ? "chip-active" : ""}`}
              onClick={() => setActiveReadBand((prev) => (prev === "short" ? "all" : "short"))}
            >
              Read: Short (&lt;3m)
            </button>
            <button
              type="button"
              className={`chip ${activeReadBand === "medium" ? "chip-active" : ""}`}
              onClick={() => setActiveReadBand((prev) => (prev === "medium" ? "all" : "medium"))}
            >
              Read: Medium (3-5m)
            </button>
            <button
              type="button"
              className={`chip ${activeReadBand === "long" ? "chip-active" : ""}`}
              onClick={() => setActiveReadBand((prev) => (prev === "long" ? "all" : "long"))}
            >
              Read: Long (&gt;5m)
            </button>
            <button
              type="button"
              className={`chip ${activeMediaType === "image" ? "chip-active" : ""}`}
              onClick={() => setActiveMediaType((prev) => (prev === "image" ? "all" : "image"))}
            >
              Image
            </button>
            <button
              type="button"
              className={`chip ${activeMediaType === "video" ? "chip-active" : ""}`}
              onClick={() => setActiveMediaType((prev) => (prev === "video" ? "all" : "video"))}
            >
              Video
            </button>
            {(activeRangeDate || activeReadBand !== "all" || activeMediaType !== "all") ? (
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setActiveRangeDate("");
                  setActiveReadBand("all");
                  setActiveMediaType("all");
                }}
              >
                Reset All
              </button>
            ) : null}
          </section>

          <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRangeItems.map((item) => {
              const text = item.explanation || "";
              const words = wordsCount(text);
              const read = readingTimeMinutes(text);

              return (
                <TiltCard key={item.date + item.title}>
                  <article className="panel p-3 reveal-up h-full">
                    {item.media_type === "image" ? (
                      <img src={item.url} alt={item.title} className="w-full h-48 object-cover rounded-lg" loading="lazy" />
                    ) : (
                      <div className="w-full h-48 rounded-lg media-thumb-empty">Media link</div>
                    )}
                    <div className="p-1 pt-3">
                      <p className="text-xs text-slate-300/70">{fmtDate(item.date)}</p>
                      <h3 className="font-semibold mt-1 clamp-2">{item.title}</h3>
                      <p className="text-sm text-slate-300/85 mt-2 clamp-3">{item.explanation}</p>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <span className="pill pill-safe">Words: {words}</span>
                        <span className="pill pill-danger">Read: {read}m</span>
                      </div>
                    </div>
                  </article>
                </TiltCard>
              );
            })}
          </section>
          {!filteredRangeItems.length ? (
            <section className="panel p-6 text-slate-300/80">
              No APOD entries match your active filters. Clear one or more filters to continue.
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
