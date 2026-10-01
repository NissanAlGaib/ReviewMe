"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
];

export function MobileNav({
  email,
  logout,
}: {
  email: string;
  logout: () => void | Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border-[1.5px] border-cream/40 text-cream"
      >
        <span className="flex flex-col items-center gap-[3.5px]">
          <span className="h-[1.5px] w-[17px] bg-cream" />
          <span className="h-[1.5px] w-[17px] bg-cream" />
          <span className="h-[1.5px] w-[17px] bg-cream" />
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 flex w-[78%] max-w-[300px] flex-col bg-ink px-6 py-6 text-cream shadow-ticket">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[9px]">
                <div className="font-mono flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-dashed border-cream/50 text-[10px] font-bold">
                  RM
                </div>
                <div className="font-sans text-[15px] font-extrabold tracking-tight">
                  ReviewMe
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-cream/40 text-lg"
              >
                ×
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-1">
              {TABS.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setIsOpen(false)}
                    className={`rounded-xl px-3.5 py-3 font-sans text-[15px] no-underline ${
                      active ? "bg-cream/15 font-bold text-cream" : "font-semibold text-cream/70"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-cream/15 pt-4">
              <span className="truncate font-sans text-[13px] text-cream/70">{email}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex h-11 w-full items-center justify-center rounded-xl border-[1.5px] border-cream/40 font-sans text-[13px] font-semibold text-cream"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
