import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../components/ui/PageHeader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import LoadingSkeleton from "../components/ui/LoadingSkeleton.jsx";
import MediaVisuals from "../components/charts/MediaVisuals.jsx";
import TiltCard from "../components/ui/TiltCard.jsx";
import { fmtDate } from "../lib/format.js";

const quickQueries = ["moon", "saturn", "apollo", "james webb", "nebula", "voyager"];
const API_BASE_ENV = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const API_BASES = [
  API_BASE_ENV,
  "https://nasa-space-explorer-backend-o3fv.onrender.com",
  "",
].filter(Boolean);

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchFromAnyBase(pathWithQuery) {
  let lastError = null;
  for (const base of API_BASES) {
    const url = `${base}${pathWithQuery}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const json = parseJsonSafe(text);
      if (!res.ok) {
        throw new Error(json?.message || `Request failed (${res.status})`);
      }
      if (!json) {
        throw new Error("Backend returned a non-JSON response.");
      }
      return json;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Load failed");
}

export default function MediaPage() {
  const didInit = useRef(false);
  const [q, setQ] = useState("moon");
  const [date, setDate] = useState("");

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeYear, setActiveYear] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [activeCenter, setActiveCenter] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [assetData, setAssetData] = useState(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");

  const search = useCallback(async (override) => {
    const query = (override ?? q).trim();
    if (!query) return;

    try {
      setLoading(true);
      setErr("");

      const params = new URLSearchParams({ q: query, limit: "60" });
      if (date) params.set("date", date);

      const json = await fetchFromAnyBase(`/api/media?${params.toString()}`);
      setData(json);
      setQ(query);
      setActiveYear("");
      setActiveKeyword("");
      setActiveCenter("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [q, date]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const runInitialSearch = async () => {
      await search("moon");
    };
    runInitialSearch();
  }, [search]);

  const results = useMemo(() => data?.results || [], [data]);
  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      const itemYear = (item.date_created || "").slice(0, 4);
      if (activeYear && itemYear !== activeYear) return false;

      if (activeCenter && (item.center || "Unknown") !== activeCenter) return false;

      if (activeKeyword) {
        const keywordMatch = (item.keywords || []).some((kw) => String(kw).toLowerCase() === activeKeyword);
        const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
        if (!keywordMatch && !text.includes(activeKeyword)) return false;
      }

      return true;
    });
  }, [results, activeYear, activeKeyword, activeCenter]);

  const latestItem = useMemo(() => {
    if (!results.length) return null;
    return [...results]
      .filter((x) => x.date_created)
      .sort((a, b) => (a.date_created > b.date_created ? -1 : 1))[0];
  }, [results]);

  const fetchAssetDetails = useCallback(async (nasaId) => {
    if (!nasaId) return null;
    return await fetchFromAnyBase(`/api/media/asset?nasaId=${encodeURIComponent(nasaId)}`);
  }, []);

  const openDetails = useCallback(async (item) => {
    setSelectedItem(item);
    setAssetData(null);
    setDetailErr("");

    setAssetLoading(true);

    try {
      const asset = await fetchAssetDetails(item?.nasa_id).catch(() => null);
      setAssetData(asset);
      if (!asset) {
        setDetailErr("Could not load extra asset analytics right now.");
      }
    } catch (e) {
      setDetailErr(e?.message || "Failed to load additional analytics");
    } finally {
      setAssetLoading(false);
    }
  }, [fetchAssetDetails]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Archive Explorer"
        title="NASA Media Intelligence"
        subtitle="Search NASA's image archive by keyword and an optional date."
        accent="amber"
      />

      <section className="panel p-4 md:p-5 reveal-up">
        <div className="grid lg:grid-cols-[1.4fr_1fr_auto] gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
            className="field-input"
            placeholder="Try: cassini, europa, plume, black hole..."
          />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
          <button onClick={() => search()} className="button-primary h-11 px-6">
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {quickQueries.map((term) => (
            <button key={term} className="chip" onClick={() => search(term)}>
              {term}
            </button>
          ))}
        </div>
      </section>

      {err ? <div className="panel border-red-300/25 bg-red-500/10 p-4 text-red-100">{err}</div> : null}
      {loading && !data ? <LoadingSkeleton rows={10} /> : null}

      {data ? (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <StatCard label="Query" value={data.q || q} hint="Active keyword" tone="neutral" />
            <StatCard
              label="Results"
              value={activeYear || activeKeyword || activeCenter ? `${filteredResults.length}/${results.length}` : results.length}
              hint={activeYear || activeKeyword || activeCenter ? "Filtered / total" : "Items returned"}
              tone="teal"
            />
            <StatCard
              label="Latest Release"
              value={latestItem?.date_created ? fmtDate(latestItem.date_created) : "-"}
              hint={latestItem?.title || "No dated item"}
              tone="violet"
            />
          </div>

          <MediaVisuals
            results={results}
            activeYear={activeYear}
            activeKeyword={activeKeyword}
            activeCenter={activeCenter}
            onYearSelect={(year) => setActiveYear((prev) => (prev === year ? "" : year))}
            onKeywordSelect={(keyword) => setActiveKeyword((prev) => (prev === keyword ? "" : keyword))}
            onCenterSelect={(center) => setActiveCenter((prev) => (prev === center ? "" : center))}
          />

          {activeYear || activeKeyword || activeCenter ? (
            <section className="panel p-4 flex flex-wrap gap-2 items-center">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300/70">Active Filters</p>
              {activeYear ? (
                <button type="button" className="chip chip-active" onClick={() => setActiveYear("")}>
                  Year: {activeYear}
                </button>
              ) : null}
              {activeCenter ? (
                <button type="button" className="chip chip-active" onClick={() => setActiveCenter("")}>
                  Center: {activeCenter}
                </button>
              ) : null}
              {activeKeyword ? (
                <button type="button" className="chip chip-active" onClick={() => setActiveKeyword("")}>
                  Keyword: {activeKeyword}
                </button>
              ) : null}
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setActiveYear("");
                  setActiveKeyword("");
                  setActiveCenter("");
                }}
              >
                Reset All
              </button>
            </section>
          ) : null}

          <section className="media-results-column panel p-4">
            <div className="media-results-grid">
              {filteredResults.map((item, idx) => (
                <TiltCard key={`${item.nasa_id || item.title}-${idx}`} className="media-results-item">
                  <button type="button" className="media-card h-full w-full text-left" onClick={() => openDetails(item)}>
                    <div className="media-thumb-wrap">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="media-thumb" loading="lazy" />
                      ) : (
                        <div className="media-thumb media-thumb-empty">No Preview</div>
                      )}
                    </div>
                    <div className="p-4 media-card-content">
                      <p className="font-semibold text-slate-100 clamp-2">{item.title}</p>
                      <p className="text-xs text-slate-300/70 mt-1">{fmtDate(item.date_created)}</p>
                      <p className="text-sm text-slate-300/85 mt-2 clamp-3">{item.description || "No description"}</p>
                    </div>
                  </button>
                </TiltCard>
              ))}
            </div>
            {!filteredResults.length ? (
              <div className="panel p-6 text-slate-300/80 mt-4">
                No assets match your current filters. Clear one or more filters to view results.
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {selectedItem ? (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-4 md:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto panel p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="chart-title">Asset Intelligence View</h3>
              <button type="button" className="chip" onClick={() => setSelectedItem(null)}>
                Close
              </button>
            </div>

            {detailErr ? <div className="panel border-red-300/25 bg-red-500/10 p-3 mt-3 text-red-100">{detailErr}</div> : null}

            <div className="mt-4 grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
              <div className="panel p-3">
                {assetData?.videoUrl ? (
                  <video className="w-full rounded-lg" controls src={assetData.videoUrl} />
                ) : (
                  <img
                    src={assetData?.imageUrl || selectedItem.image}
                    alt={selectedItem.title}
                    className="w-full max-h-[560px] object-contain rounded-lg bg-slate-950"
                  />
                )}
              </div>

              <div className="panel p-4">
                <p className="eyebrow">Selected Asset</p>
                <h4 className="font-heading text-2xl mt-2">{selectedItem.title || "Untitled"}</h4>
                <p className="subtitle mt-2">{fmtDate(selectedItem.date_created)}</p>
                <p className="subtitle mt-3">{selectedItem.description || "No description available."}</p>

                <div className="mt-4 grid sm:grid-cols-2 gap-2">
                  <div className="mini-stat"><span>NASA ID</span><strong>{selectedItem.nasa_id || "-"}</strong></div>
                  <div className="mini-stat"><span>Center</span><strong>{selectedItem.center || "-"}</strong></div>
                  <div className="mini-stat"><span>Location</span><strong>{selectedItem.location || "-"}</strong></div>
                  <div className="mini-stat"><span>Photographer</span><strong>{selectedItem.photographer || "-"}</strong></div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a className="chip chip-active" href={selectedItem.nasa_url} target="_blank" rel="noreferrer">
                    Open NASA Asset
                  </a>
                  {assetData?.videoUrl ? (
                    <a className="chip" href={assetData.videoUrl} target="_blank" rel="noreferrer">
                      Open Video
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 panel p-4">
              <h4 className="chart-title">Related NASA Services</h4>
              <p className="subtitle mt-2">
                Near Earth Object Web Service (NeoWs) is available in the dedicated NEO page with full risk analytics.
              </p>
            </div>

            <div className="mt-4 panel p-4">
              <h4 className="chart-title">Keywords</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {(selectedItem.keywords || []).length ? (
                  (selectedItem.keywords || []).slice(0, 20).map((kw) => (
                    <span key={kw} className="pill pill-safe">{kw}</span>
                  ))
                ) : (
                  <p className="subtitle">No keyword metadata available.</p>
                )}
              </div>
              {assetLoading ? <p className="subtitle mt-3">Loading extra data...</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
