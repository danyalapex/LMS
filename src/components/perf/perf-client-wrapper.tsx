"use client";

import dynamic from "next/dynamic";
import React from "react";

const PerfClient = dynamic(() => import("./perf-client"), { ssr: false, loading: () => null });

export default function PerfClientWrapper() {
  return <PerfClient />;
}
