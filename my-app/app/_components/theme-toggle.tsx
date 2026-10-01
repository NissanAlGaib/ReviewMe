"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "reviewme-theme";

type Theme = "light" | "dark";

// A minimal external store over the <html data-theme> attribute: several
// ThemeToggle instances can be mounted at once (desktop header + mobile
// drawer, shown/hidden by breakpoint), so a click on one must notify every
// other instance to re-render with the new icon.
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Matches the bare :root (light) values the server always renders with,
// since the server can't know the client's system preference or stored
// choice — useSyncExternalStore reconciles to the real getSnapshot() value
// right after hydration.
function getServerSnapshot(): Theme {
  return "light";
}

function setTheme(next: Theme) {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private browsing / storage disabled — the choice just won't persist.
  }
  for (const callback of listeners) callback();
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg border-[1.5px] text-[15px] transition-colors ${className ?? ""}`}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
