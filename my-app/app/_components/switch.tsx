"use client";

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block font-sans text-sm font-semibold text-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block font-sans text-[13px] font-medium text-muted">
            {description}
          </span>
        )}
      </span>
      <span className="relative mt-0.5 inline-flex h-6 w-11 flex-none items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`absolute inset-0 rounded-full border-[1.5px] transition-colors ${
            checked ? "border-chrome bg-chrome" : "border-ink/25 bg-transparent"
          }`}
        />
        <span
          className={`relative h-[18px] w-[18px] flex-none rounded-full transition-transform ${
            checked ? "translate-x-[22px] bg-chrome-foreground" : "translate-x-[3px] bg-ink/60"
          }`}
        />
      </span>
    </label>
  );
}
