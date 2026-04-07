import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import LoadingSkeleton from "../components/ui/LoadingSkeleton.jsx";
import NeoVisuals from "../components/charts/NeoVisuals.jsx";
import { fmtNumber } from "../lib/format.js";

function isoDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function NeoPage() {
  const [startDate, setStartDate] = useState(isoDateOffset(-3));
  const [endDate, setEndDate] = useState(isoDateOffset(0));
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDate, setActiveDate] = useState("");
  const [activeHazard, setActiveHazard] = useState("all");

  const flattened = useMemo(() => {
    if (!data?.near_earth_objects) return [];
    const out = [];
    for (const date of Object.keys(data.near_earth_objects)) {
      for (const neo of data.near_earth_objects[date]) {
        const ca = neo.close_approach_data?.[0];
        out.push({
          date,
          id: neo.id,
          name: neo.name,
          hazardous: neo.is_potentially_hazardous_asteroid,
          min_m: neo.estimated_diameter?.meters?.estimated_diameter_min,
          max_m: neo.estimated_diameter?.meters?.estimated_diameter_max,
          speed_kmh: ca?.relative_velocity?.kilometers_per_hour,
          miss_km: ca?.miss_distance?.kilometers,
        });
      }
    }
    return out.sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [data]);

  const fetchNeo = useCallback(async () => {
    try {
      setLoading(true);
      setErr("");
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/neo?startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(url);
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (!res.ok) {
        const raw = json?.message || "Failed to fetch NEO data";
        const message = String(raw);
        if (message.toLowerCase().includes("epic")) {
          throw new Error(
            "Backend route mismatch detected: /api/neo is returning EPIC responses. Restart/redeploy backend with latest code."
          );
        }
        throw new Error(message);
      }
      if (!json?.near_earth_objects) {
        throw new Error("Invalid NEO response format from backend.");
      }
      setData(json);
      setActiveDate("");
      setActiveHazard("all");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchNeo();
  }, [fetchNeo]);

  const hazardousCount = flattened.filter((x) => x.hazardous).length;
  const filteredRows = useMemo(() => {
    return flattened.filter((row) => {
      if (activeDate && row.date !== activeDate) return false;
      if (activeHazard === "hazardous" && !row.hazardous) return false;
      if (activeHazard === "safe" && row.hazardous) return false;
      return true;
    });
  }, [flattened, activeDate, activeHazard]);
  const filteredHazardCount = filteredRows.filter((x) => x.hazardous).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Impact Monitoring"
        title="Near-Earth Object Intelligence"
        subtitle="Track asteroid size, speed, and approach distance with mission-grade visualization."
        accent="amber"
      />

      <section className="panel p-4 md:p-5 reveal-up">
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 md:items-end">
          <div>
            <label className="field-label">Start Date</label>
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">End Date</label>
            <input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              type="date"
              className="field-input"
            />
          </div>
          <button onClick={fetchNeo} className="button-primary h-11 px-5">
            {loading ? "Loading..." : "Refresh Data"}
          </button>
        </div>
      </section>

      {err ? <div className="panel border-red-300/25 bg-red-500/10 p-4 text-red-100">{err}</div> : null}

      {loading && !data ? <LoadingSkeleton rows={10} /> : null}

      {data ? (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <StatCard label="Objects Detected" value={fmtNumber(data.element_count)} hint="Within selected range" tone="neutral" />
            <StatCard
              label="Hazard Candidates"
              value={fmtNumber(activeDate || activeHazard !== "all" ? filteredHazardCount : hazardousCount)}
              hint={activeDate || activeHazard !== "all" ? "Filtered scope" : "Potentially hazardous"}
              tone="rose"
            />
            <StatCard
              label="Active Rows"
              value={fmtNumber(activeDate || activeHazard !== "all" ? filteredRows.length : flattened.length)}
              hint={activeDate || activeHazard !== "all" ? "After drill-down filters" : "Rows in this window"}
              tone="teal"
            />
          </div>

          <NeoVisuals
            flattened={flattened}
            activeDate={activeDate}
            activeHazard={activeHazard}
            onDateSelect={(value) => setActiveDate((prev) => (prev === value ? "" : value))}
            onHazardSelect={(value) => setActiveHazard((prev) => (prev === value ? "all" : value))}
          />

          {activeDate || activeHazard !== "all" ? (
            <section className="panel p-4 flex flex-wrap gap-2 items-center">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300/70">Active Filters</p>
              {activeDate ? (
                <button type="button" className="chip chip-active" onClick={() => setActiveDate("")}>
                  Date: {activeDate}
                </button>
              ) : null}
              {activeHazard !== "all" ? (
                <button type="button" className="chip chip-active" onClick={() => setActiveHazard("all")}>
                  Risk: {activeHazard}
                </button>
              ) : null}
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setActiveDate("");
                  setActiveHazard("all");
                }}
              >
                Reset All
              </button>
            </section>
          ) : null}

          <section className="panel overflow-hidden reveal-up">
            <div className="overflow-auto max-h-[560px]">
              <table className="neo-table min-w-full text-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Hazard</th>
                    <th>Diameter (m)</th>
                    <th>Speed (km/h)</th>
                    <th>Miss Distance (km)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id + row.date}>
                      <td>{row.date}</td>
                      <td className="font-semibold text-slate-100">{row.name}</td>
                      <td>
                        <span className={row.hazardous ? "pill pill-danger" : "pill pill-safe"}>
                          {row.hazardous ? "High" : "Low"}
                        </span>
                      </td>
                      <td>
                        {fmtNumber(row.min_m, { maximumFractionDigits: 1 })} - {fmtNumber(row.max_m, { maximumFractionDigits: 1 })}
                      </td>
                      <td>{fmtNumber(row.speed_kmh, { maximumFractionDigits: 0 })}</td>
                      <td>{fmtNumber(row.miss_km, { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                  {!filteredRows.length ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-300/80 py-6">
                        No NEO rows match your active filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
