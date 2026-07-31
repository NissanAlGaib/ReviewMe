"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExtractButton({
  questionSetId,
  hasPending,
}: {
  questionSetId: string;
  hasPending: boolean;
}) {
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

      // A platform-level failure (e.g. the request exceeding the serverless
      // function's time limit) returns an HTML/plain-text error page instead
      // of JSON — res.json() would throw an opaque "not valid JSON" error in
      // that case, so parse defensively and fall back to a clear message.
      let data: { error?: string; questionCount?: number } = {};
      try {
        data = await res.json();
      } catch {
        // non-JSON response, handled by the !res.ok branch below
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            `Extraction failed (${res.status}). If you uploaded a lot of files, try a smaller set — the request may have timed out.`
        );
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
        disabled={isExtracting || !hasPending}
        className="flex h-[46px] w-fit items-center rounded-xl bg-ink px-5 font-sans text-sm font-bold text-cream disabled:opacity-50"
      >
        {isExtracting
          ? "Extracting questions… this can take a minute"
          : hasPending
            ? "Run AI extraction"
            : "All uploaded files extracted"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
