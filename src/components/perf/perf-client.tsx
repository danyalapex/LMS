"use client";

import { useEffect } from "react";

const sendMetrics = async (payload: any) => {
  try {
    await fetch("/api/perf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.debug("perf: failed to send", err);
  }
};

export default function PerfClient() {
  useEffect(() => {
    try {
      performance.mark("perf-client-mounted");
    } catch (e) {}

    requestAnimationFrame(() => {
      try {
        performance.mark("perf-client-mounted:end");
        performance.measure("perf:hydration", "perf-client-mounted", "perf-client-mounted:end");
      } catch (e) {}

      const m = performance.getEntriesByName("perf:hydration")[0];
      const hydrationMs = m ? Math.round(m.duration) : null;

      const paint = (performance.getEntriesByType("paint") as PerformanceEntry[]).find(
        (p) => (p as any).name === "first-contentful-paint"
      );
      const fcp = paint ? Math.round(paint.startTime) : null;

      const nav = (performance.getEntriesByType("navigation") as PerformanceNavigationTiming[])[0];
      const ttfb = nav ? Math.round(nav.responseStart - nav.requestStart) : null;
      const load = nav ? Math.round((nav as any).loadEventEnd - nav.startTime) : null;

      const payload = {
        type: "page-load",
        url: location.pathname + location.search,
        hydrationMs,
        fcp,
        ttfb,
        load,
        ua: navigator.userAgent,
        ts: Date.now(),
      };

      console.info("perf:page", payload);
      void sendMetrics(payload);
      try {
        performance.clearMarks();
        performance.clearMeasures();
      } catch (e) {}
    });

    (window as any).__perf = Object.assign((window as any).__perf || {}, {
      markTabStart: (id: string) => {
        try {
          performance.mark(`tab-start:${id}`);
        } catch (e) {}
      },
      markTabEnd: (id: string) => {
        try {
          performance.mark(`tab-end:${id}`);
          performance.measure(`tab:${id}`, `tab-start:${id}`, `tab-end:${id}`);
          const m = performance.getEntriesByName(`tab:${id}`)[0];
          const duration = m ? Math.round(m.duration) : null;
          const payload = { type: "tab", id, duration, url: location.pathname, ts: Date.now() };
          console.info("perf:tab", payload);
          void sendMetrics(payload);
          performance.clearMarks();
          performance.clearMeasures();
        } catch (e) {
          console.debug(e);
        }
      },
    });

    return () => {
      // cleanup if needed
    };
  }, []);

  return null;
}
