export default function StatCard({ label, value, hint, tone = "neutral" }) {
  return (
    <article className={`panel p-4 stat tone-${tone} reveal-up`}> 
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  );
}
