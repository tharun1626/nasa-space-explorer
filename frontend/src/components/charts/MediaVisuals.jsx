import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";

const stopWords = new Set([
  "the",
  "and",
  "for",
  "from",
  "with",
  "this",
  "that",
  "moon",
  "mars",
  "nasa",
  "image",
  "images",
  "mission",
  "space",
  "earth",
  "photo",
  "taken",
  "showing",
  "shows",
]);

function normalizeKeyword(value) {
  if (!value) return "";
  return value.trim().toLowerCase();
}

function collectKeywords(item) {
  const explicit = (item.keywords || []).map(normalizeKeyword).filter(Boolean);
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  const fromText = (text.match(/[a-z]{4,}/g) || []).filter((token) => !stopWords.has(token));
  return [...explicit, ...fromText];
}

function computeAnalytics(results) {
  const byYearMap = new Map();
  const byCenterMap = new Map();
  const byKeywordMap = new Map();
  const byMonthMap = new Map();
  let metadataFilled = 0;

  for (const item of results) {
    const year = (item.date_created || "").slice(0, 4) || "Unknown";
    byYearMap.set(year, (byYearMap.get(year) || 0) + 1);

    const center = item.center || "Unknown";
    byCenterMap.set(center, (byCenterMap.get(center) || 0) + 1);

    const month = (item.date_created || "").slice(0, 7) || "Unknown";
    byMonthMap.set(month, (byMonthMap.get(month) || 0) + 1);

    if (item.nasa_id || item.center || item.photographer || item.location) {
      metadataFilled += 1;
    }

    const keywords = collectKeywords(item);
    for (const keyword of keywords) {
      byKeywordMap.set(keyword, (byKeywordMap.get(keyword) || 0) + 1);
    }
  }

  const byYear = Array.from(byYearMap.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => (a.year > b.year ? 1 : -1));

  const byCenter = Array.from(byCenterMap.entries())
    .map(([center, count]) => ({ center, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  const keywords = Array.from(byKeywordMap.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, score]) => ({ term, score }));

  const byMonth = Array.from(byMonthMap.entries())
    .map(([month, count]) => ({ month: month.slice(2), count }))
    .filter((row) => row.month !== "Unknown")
    .sort((a, b) => (a.month > b.month ? 1 : -1))
    .slice(-12);

  const years = byYear.filter((x) => x.year !== "Unknown");
  const rangeStart = years[0]?.year || "N/A";
  const rangeEnd = years[years.length - 1]?.year || "N/A";

  return {
    byYear,
    byCenter,
    keywords,
    byMonth,
    rangeStart,
    rangeEnd,
    metadataCoverage: results.length ? Math.round((metadataFilled / results.length) * 100) : 0,
  };
}

export default function MediaVisuals({
  results,
  activeYear,
  activeKeyword,
  activeCenter,
  onYearSelect,
  onKeywordSelect,
  onCenterSelect,
}) {
  const analytics = useMemo(() => computeAnalytics(results || []), [results]);

  if (!results?.length) return null;

  const yearColors = analytics.byYear.map((row) =>
    row.year === activeYear ? "#63ffa4" : "rgba(84, 214, 255, 0.82)"
  );

  const centerColors = ["#54d6ff", "#63ffa4", "#8f9bff", "#ffb25f", "#6fe3ff", "#a6b2ff", "#86f0c4"];

  return (
    <div className="space-y-4">
      <section className="grid md:grid-cols-3 gap-4">
        <article className="panel p-4 reveal-up">
          <p className="text-xs text-slate-300/70 uppercase tracking-[0.12em]">Coverage Window</p>
          <p className="stat-value">{analytics.rangeStart} - {analytics.rangeEnd}</p>
          <p className="stat-hint">Detected publication span</p>
        </article>
        <article className="panel p-4 reveal-up">
          <p className="text-xs text-slate-300/70 uppercase tracking-[0.12em]">Metadata Quality</p>
          <p className="stat-value text-emerald-300">{analytics.metadataCoverage}%</p>
          <p className="stat-hint">Assets with core fields populated</p>
        </article>
        <article className="panel p-4 reveal-up">
          <p className="text-xs text-slate-300/70 uppercase tracking-[0.12em]">Centers Tracked</p>
          <p className="stat-value text-indigo-300">{analytics.byCenter.length}</p>
          <p className="stat-hint">Top NASA centers in current query</p>
        </article>
      </section>

      <div className="grid xl:grid-cols-2 gap-4">
        <section className="panel p-4 reveal-up">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="chart-title">Release Timeline Explorer</h3>
              <p className="chart-subtitle">Click a year bar to filter results instantly</p>
            </div>
            {activeYear ? (
              <button type="button" onClick={() => onYearSelect("")} className="chip">
                Clear Year
              </button>
            ) : null}
          </div>
          <div className="chart-shell h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(173,214,255,0.12)" />
                <XAxis dataKey="year" stroke="rgba(220,239,255,0.85)" />
                <YAxis stroke="rgba(220,239,255,0.85)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#021326",
                    border: "1px solid rgba(108,214,255,0.35)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} onClick={(payload) => onYearSelect(payload?.year || "")}>
                  {analytics.byYear.map((row, index) => (
                    <Cell key={`${row.year}-${index}`} fill={yearColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-4 reveal-up">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="chart-title">Center Activity Mix</h3>
              <p className="chart-subtitle">Select a center segment to narrow the archive grid</p>
            </div>
            {activeCenter ? (
              <button type="button" onClick={() => onCenterSelect("")} className="chip">
                Clear Center
              </button>
            ) : null}
          </div>
          <div className="chart-shell h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.byCenter}
                  dataKey="count"
                  nameKey="center"
                  innerRadius={60}
                  outerRadius={105}
                  onClick={(payload) => onCenterSelect(payload?.center || "")}
                >
                  {analytics.byCenter.map((row, index) => (
                    <Cell
                      key={`${row.center}-${index}`}
                      fill={centerColors[index % centerColors.length]}
                      fillOpacity={activeCenter && activeCenter !== row.center ? 0.45 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#021326",
                    border: "1px solid rgba(108,214,255,0.35)",
                    borderRadius: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {analytics.byCenter.map((center) => (
              <button
                key={center.center}
                type="button"
                onClick={() => onCenterSelect(center.center)}
                className={`chip ${activeCenter === center.center ? "chip-active" : ""}`}
              >
                {center.center} ({center.count})
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <section className="panel p-4 reveal-up">
          <h3 className="chart-title">Recent Monthly Momentum</h3>
          <p className="chart-subtitle">Last 12 months represented in this result set</p>
          <div className="chart-shell h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(173,214,255,0.12)" />
                <XAxis dataKey="month" stroke="rgba(220,239,255,0.85)" />
                <YAxis stroke="rgba(220,239,255,0.85)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#021326",
                    border: "1px solid rgba(108,214,255,0.35)",
                    borderRadius: 12,
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#63ffa4" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-4 reveal-up">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="chart-title">Keyword Intelligence</h3>
              <p className="chart-subtitle">Click a keyword to filter the archive cards</p>
            </div>
            {activeKeyword ? (
              <button type="button" onClick={() => onKeywordSelect("")} className="chip">
                Clear Keyword
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {analytics.keywords.map((row) => (
              <button
                key={row.term}
                type="button"
                onClick={() => onKeywordSelect(row.term)}
                className={`media-keyword-chip ${activeKeyword === row.term ? "media-keyword-chip-active" : ""}`}
              >
                <span>{row.term}</span>
                <strong>{row.score}</strong>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
