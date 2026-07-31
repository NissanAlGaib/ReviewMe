"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExtractButton({ questionSetId }: { questionSetId: string }) {
  const router = useRouter();
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsExtracting(true);
    setError(null);

    try {
      const res = await fetch(`/api/question-sets/${questionSetId}/extract`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Extraction failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isExtracting}
        className="flex h-[46px] w-fit items-center rounded-xl bg-ink px-5 font-sans text-sm font-bold text-cream disabled:opacity-50"
      >
        {isExtracting ? "Extracting questions… this can take a minute" : "Run AI extraction"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
