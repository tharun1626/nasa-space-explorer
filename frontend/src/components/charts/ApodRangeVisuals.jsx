import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export default function ApodRangeVisuals({ items, activeDate, onDateSelect }) {
  if (!items?.length) return null;

  const trendData = items.map((item) => {
    const text = item.explanation || "";
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return {
      date: (item.date || "").slice(5),
      fullDate: item.date,
      words,
      read: Math.max(1, Math.round(words / 220)),
    };
  });

  return (
    <div className="grid xl:grid-cols-2 gap-4">
      <section className="panel p-4 reveal-up">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="chart-title">Narrative Length Trend</h3>
            <p className="chart-subtitle">Words per APOD entry in selected range</p>
          </div>
          {activeDate ? (
            <button type="button" className="chip" onClick={() => onDateSelect("")}>
              Clear Day
            </button>
          ) : null}
        </div>
        <div className="chart-shell h-72 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(173,214,255,0.12)" />
              <XAxis dataKey="date" stroke="rgba(220,239,255,0.85)" />
              <YAxis stroke="rgba(220,239,255,0.85)" />
              <Tooltip />
              <Line type="monotone" dataKey="words" stroke="#54d6ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel p-4 reveal-up">
        <h3 className="chart-title">Read Time Distribution</h3>
        <p className="chart-subtitle">Click a bar to focus one APOD day</p>
        <div className="chart-shell h-72 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(173,214,255,0.12)" />
              <XAxis dataKey="date" stroke="rgba(220,239,255,0.85)" />
              <YAxis stroke="rgba(220,239,255,0.85)" />
              <Tooltip />
              <Bar dataKey="read" radius={[8, 8, 0, 0]} onClick={(payload) => onDateSelect(payload?.fullDate || "")}> 
                {trendData.map((row) => (
                  <Cell
                    key={row.fullDate}
                    fill={activeDate === row.fullDate ? "#63ffa4" : "#8f9bff"}
                    fillOpacity={activeDate && activeDate !== row.fullDate ? 0.45 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
