"use client";

import { useEffect } from "react";

export default function TenantBrandingClient() {
  useEffect(() => {
    let cancelled = false;

    const applyCss = (css: string) => {
      try {
        const existing = document.querySelector('style[data-tenant-branding]');
        if (existing) {
          existing.textContent = css;
          return;
        }
        const style = document.createElement("style");
        style.setAttribute("data-tenant-branding", "true");
        style.innerHTML = css;
        document.head.appendChild(style);
      } catch (e) {
        console.debug("tenant-branding-client applyCss error", e);
      }
    };

    const run = async () => {
      try {
        if ((window as any).requestIdleCallback) {
          await new Promise((r) => (window as any).requestIdleCallback(r, { timeout: 2000 }));
        } else {
          await new Promise((r) => setTimeout(r, 60));
        }
        if (cancelled) return;
        const res = await fetch("/api/branding");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.css) {
          applyCss(data.css);
        }
      } catch (err) {
        console.debug("tenant-branding-client fetch error", err);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
