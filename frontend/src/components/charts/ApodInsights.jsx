import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { readingTimeMinutes, wordsCount, clamp } from "../../lib/format.js";

export default function ApodInsights({ apod }) {
  if (!apod) return null;

  const text = apod.explanation || "";
  const words = wordsCount(text);
  const chars = text.length;
  const sentences = text.split(/[.!?]+/).filter(Boolean).length;
  const readMinutes = readingTimeMinutes(text);

  const qualityData = [
    { metric: "Depth", value: clamp(Math.round(words / 12), 20, 100) },
    { metric: "Readability", value: clamp(92 - Math.round(chars / 140), 25, 95) },
    { metric: "Density", value: clamp(Math.round((words / Math.max(1, sentences)) * 4), 20, 100) },
    { metric: "Narrative", value: clamp(Math.round(sentences * 2.5), 20, 100) },
  ];

  return (
    <section className="panel p-5 reveal-up">
      <h3 className="chart-title">APOD Narrative Analytics</h3>
      <p className="chart-subtitle">A quick quality profile from the current description text.</p>
      <div className="grid md:grid-cols-4 gap-3 mt-4 mb-4">
        <div className="mini-stat">
          <span>Words</span>
          <strong>{words}</strong>
        </div>
        <div className="mini-stat">
          <span>Characters</span>
          <strong>{chars}</strong>
        </div>
        <div className="mini-stat">
          <span>Sentences</span>
          <strong>{sentences}</strong>
        </div>
        <div className="mini-stat">
          <span>Read Time</span>
          <strong>{readMinutes} min</strong>
        </div>
      </div>

      <div className="chart-shell h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={qualityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(173,214,255,0.15)" />
            <XAxis dataKey="metric" stroke="rgba(220,239,255,0.85)" />
            <YAxis stroke="rgba(220,239,255,0.85)" />
            <Tooltip
              contentStyle={{
                background: "#021326",
                border: "1px solid rgba(108,214,255,0.35)",
                borderRadius: 12,
              }}
            />
            <Bar dataKey="value" fill="url(#apodGradient)" radius={[8, 8, 0, 0]} />
            <defs>
              <linearGradient id="apodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#54d6ff" stopOpacity={0.95} />
                <stop offset="95%" stopColor="#63ffa4" stopOpacity={0.45} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
