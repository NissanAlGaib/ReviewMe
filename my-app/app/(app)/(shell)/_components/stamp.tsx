const COLORS = {
  green: "var(--color-success)",
  amber: "var(--color-amber)",
} as const;

export function Stamp({ label, color }: { label: string; color: keyof typeof COLORS }) {
  const value = COLORS[color];
  return (
    <span
      className="flex-none rounded-md border-2 px-2.5 py-[3px] font-mono text-[11px] font-bold tracking-[.08em]"
      style={{ borderColor: value, color: value, transform: "rotate(-6deg)" }}
    >
      {label}
    </span>
  );
}
