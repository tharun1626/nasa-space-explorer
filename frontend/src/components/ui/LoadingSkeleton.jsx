export default function LoadingSkeleton({ rows = 3, className = "" }) {
  return (
    <div className={`panel p-5 ${className}`}>
      <div className="skeleton h-6 w-2/5 mb-4" />
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="skeleton h-4 w-full mb-2" />
      ))}
    </div>
  );
}
