// Circular progress ring driven by the theme's --primary / --border tokens.
export default function ProgressRing({
  value, max, size = 88, stroke = 7, children,
}: {
  value: number; max: number; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const r = (size - stroke - 3) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(max > 0 ? value / max : 0, 1));
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--primary)" strokeWidth={stroke}
          strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      {children && <div className="absolute text-center">{children}</div>}
    </div>
  );
}
