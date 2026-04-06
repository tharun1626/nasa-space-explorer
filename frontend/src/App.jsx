import { Routes, Route, NavLink } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import ApodPage from "./pages/ApodPage.jsx";
import NeoPage from "./pages/NeoPage.jsx";
import MarsPage from "./pages/MarsPage.jsx";
import MediaPage from "./pages/MediaPage.jsx";
import EarthPage from "./pages/EarthPage.jsx";

const linkClass = ({ isActive }) =>
  `nav-link ${isActive ? "nav-link-active" : "nav-link-idle"}`;

export default function App() {
  return (
    <div className="app-shell text-slate-100 min-h-screen relative overflow-x-hidden">
      <div className="starfield-3d" aria-hidden="true">
        <div className="star-layer star-layer-near" />
        <div className="star-layer star-layer-mid" />
        <div className="star-layer star-layer-far" />
      </div>

      <header className="sticky top-0 z-40 border-b border-cyan-200/10 backdrop-blur-xl bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Space Intelligence Suite</p>
            <p className="font-heading text-xl tracking-wide">NASA Data Explorer Pro</p>
          </div>

          <nav className="flex flex-wrap gap-2">
            <NavLink to="/" className={linkClass} end>
              Home
            </NavLink>
            <NavLink to="/apod" className={linkClass}>
              APOD
            </NavLink>
            <NavLink to="/neo" className={linkClass}>
              NEO
            </NavLink>
            <NavLink to="/mars" className={linkClass}>
              Mars
            </NavLink>
            <NavLink to="/media" className={linkClass}>
              Archive
            </NavLink>
            <NavLink to="/earth" className={linkClass}>
              Earth
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/apod" element={<ApodPage />} />
          <Route path="/neo" element={<NeoPage />} />
          <Route path="/mars" element={<MarsPage />} />
          <Route path="/media" element={<MediaPage />} />
          <Route path="/earth" element={<EarthPage />} />
        </Routes>
      </main>

      <footer className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8 text-slate-300/70 text-sm">
        <div className="panel p-4 flex flex-wrap items-center justify-between gap-2">
          <p>Created by Tharun Bukya • NASA Data Explorer Pro</p>
          <p>Backend: {import.meta.env.VITE_API_BASE_URL}</p>
        </div>
      </footer>
    </div>
  );
}
