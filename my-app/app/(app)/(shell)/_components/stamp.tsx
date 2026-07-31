const COLORS = {
  green: "#166534",
  amber: "#b45309",
} as const;

export function Stamp({ label, color }: { label: string; color: keyof typeof COLORS }) {
  const hex = COLORS[color];
  return (
    <span
      className="flex-none rounded-md border-2 px-2.5 py-[3px] font-mono text-[11px] font-bold tracking-[.08em]"
      style={{ borderColor: hex, color: hex, transform: "rotate(-6deg)" }}
    >
      {label}
    </span>
  );
}
