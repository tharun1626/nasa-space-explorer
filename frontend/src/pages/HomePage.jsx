import { Link } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader.jsx";

const modules = [
  {
    title: "APOD Intelligence",
    description: "Explore daily astronomy stories, narrative depth, and timeline analytics.",
    href: "/apod",
    tag: "Astronomy",
  },
  {
    title: "NEO Risk Monitor",
    description: "Track near-earth objects with speed, distance, and risk drill-down filtering.",
    href: "/neo",
    tag: "Safety",
  },
  {
    title: "Archive Explorer",
    description: "Search NASA media by date and keyword with interactive visual intelligence.",
    href: "/media",
    tag: "Media",
  },
  {
    title: "Earth Observatory",
    description: "Inspect EPIC Earth frames and imagery with timeline-ready playback controls.",
    href: "/earth",
    tag: "Earth",
  },
];

const engineeringHighlights = [
  "Real NASA API integrations across APOD, NEO, EPIC, and Media Archive routes.",
  "Interactive analytics dashboards with drill-down filtering and visual exploration.",
  "Production-ready React architecture using memoized selectors and reusable UI components.",
  "Error states, loading skeletons, and resilient rendering patterns for smoother UX.",
];

const hiringSignals = [
  { label: "Frontend Stack", value: "React + Recharts + Tailwind" },
  { label: "Backend Stack", value: "Node + Express API layer" },
  { label: "Data Domains", value: "Astronomy, NEO risk, Earth imagery, media intelligence" },
  { label: "UX Standard", value: "Clean dashboard flows with filter-first interaction" },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mission Overview"
        title="NASA Data Explorer Pro"
        subtitle="A unified mission dashboard for astronomy narratives, near-earth object intelligence, media discovery, and Earth observation workflows."
        accent="amber"
      />

      <section className="grid md:grid-cols-3 gap-4">
        <article className="panel p-4 reveal-up">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300/70">Modules</p>
          <p className="stat-value">4</p>
          <p className="stat-hint">Integrated intelligence sections</p>
        </article>
        <article className="panel p-4 reveal-up">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300/70">Data Sources</p>
          <p className="stat-value text-emerald-300">NASA APIs</p>
          <p className="stat-hint">APOD, NEO, EPIC, Media Archive</p>
        </article>
        <article className="panel p-4 reveal-up">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300/70">Interaction Model</p>
          <p className="stat-value text-indigo-300">Drill-Down</p>
          <p className="stat-hint">Cross-page exploratory filtering</p>
        </article>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {modules.map((module) => (
          <article key={module.href} className="panel p-5 reveal-up home-module-card">
            <p className="eyebrow">{module.tag}</p>
            <h2 className="font-heading text-xl mt-2 leading-tight">{module.title}</h2>
            <p className="subtitle mt-3">{module.description}</p>
            <Link to={module.href} className="button-primary h-10 px-4 text-sm mt-4 inline-flex">
              Open Module
            </Link>
          </article>
        ))}
      </section>

      <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
        <article className="panel p-5 reveal-up">
          <h3 className="chart-title">Engineering Highlights</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-200/90 leading-6">
            {engineeringHighlights.map((point) => (
              <li key={point}>• {point}</li>
            ))}
          </ul>
        </article>

        <article className="panel p-5 reveal-up">
          <h3 className="chart-title">Hiring Snapshot</h3>
          <div className="mt-3 space-y-2">
            {hiringSignals.map((item) => (
              <div key={item.label} className="mini-stat">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
