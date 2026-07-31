"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 pb-[3px] font-sans text-[13px] no-underline ${
              active
                ? "border-amber font-bold text-cream"
                : "border-transparent font-semibold text-cream/55 hover:text-cream/80"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </>
  );
}
