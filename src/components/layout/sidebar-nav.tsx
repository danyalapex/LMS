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
    <nav className="space-y-2">
      {items.map((item, index) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`block rounded-[24px] border px-4 py-4 transition ${
              isActive
                ? "border-transparent bg-[color:var(--accent-soft)] shadow-[0_20px_40px_rgba(15,118,110,0.12)]"
                : "border-[color:var(--border)] bg-white/70 hover:bg-white/92"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="chip min-w-10 justify-center px-0 py-2 text-[10px]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
