"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/lib/navigation";

type SidebarNavProps = {
  items: NavigationItem[];
};

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-2">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`block rounded-xl border px-3 py-3 transition ${
              isActive
                ? "border-emerald-400 bg-emerald-50"
                : "border-[color:var(--border)] bg-white/70 hover:bg-white"
            }`}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="mt-1 text-xs text-slate-600">{item.description}</p>
          </Link>
        );
      })}
    </nav>
  );
}
