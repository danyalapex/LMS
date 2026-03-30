"use client";

import { useEffect } from "react";

export default function TenantBranding() {
  useEffect(() => {
    let mounted = true;

    async function loadBranding() {
      try {
        const res = await fetch("/api/branding", { cache: "no-store" });
        if (!mounted) return;
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;

        const root = document.documentElement;
        if (data.primary_color) root.style.setProperty("--brand-primary", data.primary_color);
        if (data.secondary_color) root.style.setProperty("--brand-secondary", data.secondary_color);
        if (data.accent_color) root.style.setProperty("--brand-accent", data.accent_color);
        if (data.brand_name) root.style.setProperty("--brand-name", JSON.stringify(data.brand_name));
      } catch (err) {
        // ignore
        console.debug("TenantBranding: failed to load branding", err);
      }
    }

    loadBranding();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
