export default function TiltCard({ children, className = "" }) {
  return (
    <div className={className}>
      <div>
        {children}
      </div>
    </div>
  );
}
