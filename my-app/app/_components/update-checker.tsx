"use client";

import { useEffect, useRef, useState } from "react";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const DISMISS_COOLDOWN_MS = 15 * 60 * 1000;

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const dismissedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const currentBuildId = process.env.NEXT_PUBLIC_BUILD_ID;

    async function check() {
      if (dismissedAtRef.current && Date.now() - dismissedAtRef.current < DISMISS_COOLDOWN_MS) {
        return;
      }

      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data: { buildId?: string } = await res.json();
        if (data.buildId && data.buildId !== currentBuildId) {
          setUpdateAvailable(true);
        }
      } catch {
        // Offline or a transient failure — just try again on the next tick.
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") check();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function handleDismiss() {
    dismissedAtRef.current = Date.now();
    setUpdateAvailable(false);
  }

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-4 sm:w-[340px]">
      <div className="ticket flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10.5px] font-bold tracking-[.08em] text-amber uppercase">
              Update available
            </div>
            <div className="mt-1 font-sans text-[13px] font-medium text-ink">
              A new version of ReviewMe is ready. Refresh to get the latest.
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-muted hover:text-ink"
          >
            ×
          </button>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-9 flex-1 items-center justify-center rounded-lg border-[1.5px] border-ink px-3 font-sans text-xs font-semibold text-ink"
          >
            Later
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-9 flex-1 items-center justify-center rounded-lg bg-chrome px-3 font-sans text-xs font-bold text-chrome-foreground"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
