import { useEffect, useRef, useState } from "react";

export default function PageHeader({ eyebrow, title, subtitle, accent = "cyan" }) {
  const ref = useRef(null);
  const frameRef = useRef(0);
  const [style, setStyle] = useState({
    "--header-parallax-y": "0px",
    "--header-glow-x": "0px",
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      frameRef.current = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const progress = (rect.top + rect.height * 0.5 - vh * 0.5) / vh;
      const y = Math.max(-16, Math.min(16, progress * -18));
      const glowX = Math.max(-14, Math.min(14, progress * -20));
      setStyle({
        "--header-parallax-y": `${y.toFixed(2)}px`,
        "--header-glow-x": `${glowX.toFixed(2)}px`,
      });
    };

    const requestUpdate = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <section
      ref={ref}
      style={style}
      className={`panel panel-accent-${accent} p-6 md:p-8 reveal-up parallax-header`}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="title-display mt-2 parallax-title">{title}</h1>
      {subtitle ? <p className="subtitle mt-3 max-w-3xl">{subtitle}</p> : null}
    </section>
  );
}
