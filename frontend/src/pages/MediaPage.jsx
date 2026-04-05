import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../components/ui/PageHeader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import LoadingSkeleton from "../components/ui/LoadingSkeleton.jsx";
import MediaVisuals from "../components/charts/MediaVisuals.jsx";
import TiltCard from "../components/ui/TiltCard.jsx";
import { fmtDate } from "../lib/format.js";

const quickQueries = ["moon", "saturn", "apollo", "james webb", "nebula", "voyager"];

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

  const search = useCallback(async (override) => {
    const query = (override ?? q).trim();
    if (!query) return;

    try {
      setLoading(true);
      setErr("");

      const params = new URLSearchParams({ q: query, limit: "60" });
      if (date) params.set("date", date);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/media?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to search media");
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
                  <article className="media-card h-full w-full text-left">
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
                  </article>
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
    </div>
  );
}
