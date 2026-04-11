"use client";

export function PrintPageButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="button-primary"
    >
      Print / Save PDF
    </button>
  );
}
