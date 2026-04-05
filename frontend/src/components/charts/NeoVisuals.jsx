import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + Number(v || 0), 0) / values.length;
}

export default function NeoVisuals({
  flattened,
  activeDate,
  activeHazard,
  onDateSelect,
  onHazardSelect,
}) {
  if (!flattened?.length) return null;

  const byDate = new Map();
  for (const row of flattened) {
    const list = byDate.get(row.date) || [];
    list.push(row);
    byDate.set(row.date, list);
  }

  const speedTrend = Array.from(byDate.entries())
    .map(([date, rows]) => ({
      keyDate: date,
      date: date.slice(5),
      avgSpeed: Math.round(avg(rows.map((x) => Number(x.speed_kmh) || 0))),
      count: rows.length,
    }))
    .sort((a, b) => (a.keyDate > b.keyDate ? 1 : -1));

  const hazardousCount = flattened.filter((x) => x.hazardous).length;
  const safeCount = flattened.length - hazardousCount;
  const hazardData = [
    { name: "Hazardous", value: hazardousCount },
    { name: "Observed", value: safeCount },
  ];

  const scatterData = flattened.slice(0, 45).map((row) => ({
    size: ((Number(row.min_m) || 0) + (Number(row.max_m) || 0)) / 2,
    miss: (Number(row.miss_km) || 0) / 1_000_000,
    speed: (Number(row.speed_kmh) || 0) / 1000,
  }));

  const recentDates = speedTrend.slice(-8);

  return (
    <div className="space-y-4">
      <div className="grid xl:grid-cols-3 gap-4">
        <section className="panel p-4 xl:col-span-2 reveal-up">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="chart-title">Velocity Trend</h3>
              <p className="chart-subtitle">Average speed by day (km/h)</p>
            </div>
            {activeDate ? (
              <button type="button" className="chip" onClick={() => onDateSelect("")}>
                Clear Day
              </button>
            ) : null}
          </div>
          <div className="chart-shell h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={speedTrend}>
                <defs>
                  <linearGradient id="neoArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#31dbff" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#31dbff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(173,214,255,0.12)" />
                <XAxis dataKey="date" stroke="rgba(220,239,255,0.85)" />
                <YAxis stroke="rgba(220,239,255,0.85)" />
                <Tooltip
                  contentStyle={{
                    background: "#021326",
                    border: "1px solid rgba(108,214,255,0.35)",
                    borderRadius: 12,
                  }}
                />
                <Area type="monotone" dataKey="avgSpeed" stroke="#6fe3ff" fill="url(#neoArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {recentDates.map((d) => (
              <button
                key={d.keyDate}
                type="button"
                className={`chip ${activeDate === d.keyDate ? "chip-active" : ""}`}
                onClick={() => onDateSelect(d.keyDate)}
              >
                {d.keyDate}
              </button>
            ))}
          </div>
        </section>

        <section className="panel p-4 reveal-up">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="chart-title">Risk Ratio</h3>
              <p className="chart-subtitle">Potentially hazardous vs observed</p>
            </div>
            {activeHazard !== "all" ? (
              <button type="button" className="chip" onClick={() => onHazardSelect("all")}>
                Clear Risk
              </button>
            ) : null}
          </div>
          <div className="chart-shell h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hazardData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  onClick={(entry) => onHazardSelect(entry?.name === "Hazardous" ? "hazardous" : "safe")}
                >
                  <Cell fill="#ff6b7a" fillOpacity={activeHazard === "safe" ? 0.45 : 1} />
                  <Cell fill="#58f5b3" fillOpacity={activeHazard === "hazardous" ? 0.45 : 1} />
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
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={`chip ${activeHazard === "hazardous" ? "chip-active" : ""}`}
              onClick={() => onHazardSelect("hazardous")}
            >
              Hazardous
            </button>
            <button
              type="button"
              className={`chip ${activeHazard === "safe" ? "chip-active" : ""}`}
              onClick={() => onHazardSelect("safe")}
            >
              Safe
            </button>
          </div>
        </section>

        <section className="panel p-4 xl:col-span-3 reveal-up">
          <h3 className="chart-title">Approach Field</h3>
          <p className="chart-subtitle">Bubble size tracks velocity. X=size (m), Y=miss distance (million km)</p>
          <div className="chart-shell h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(173,214,255,0.12)" />
                <XAxis type="number" dataKey="size" name="Size (m)" stroke="rgba(220,239,255,0.85)" />
                <YAxis type="number" dataKey="miss" name="Miss distance" stroke="rgba(220,239,255,0.85)" />
                <ZAxis type="number" dataKey="speed" range={[70, 420]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={scatterData} fill="#9f8cff" fillOpacity={0.65} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
