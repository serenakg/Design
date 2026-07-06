"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIVE_ITEMS = [
  { href: "", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/settings", label: "Settings & GDPR" },
];

// Later phases stay visible so the shape of the platform is clear,
// but they're inert until their phase ships.
const UPCOMING = [
  { label: "Site & Blog", phase: 2 },
  { label: "Email & Funnels", phase: 3 },
  { label: "Social Builder", phase: 4 },
  { label: "Community", phase: 5 },
  { label: "Courses", phase: 6 },
];

export function WorkspaceNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/w/${slug}`;

  return (
    <nav aria-label="Sections" className="flex flex-col gap-1">
      <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
        Sections
      </p>
      {LIVE_ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const active =
          item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={item.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-2 py-1.5 text-sm ${
              active
                ? "bg-stone-100 font-semibold text-stone-900"
                : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <p className="px-2 pt-3 pb-1 text-xs font-semibold tracking-wide text-stone-400 uppercase">
        Coming next
      </p>
      {UPCOMING.map((item) => (
        <span
          key={item.label}
          className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-stone-400"
        >
          {item.label}
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">
            Phase {item.phase}
          </span>
        </span>
      ))}
    </nav>
  );
}
