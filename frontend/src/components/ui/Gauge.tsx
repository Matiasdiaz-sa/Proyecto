import React from "react";

export function Gauge({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const fill = (score / 10) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="gauge-track" />
        <circle
          cx="60" cy="60" r={r} fill="none" strokeWidth="10"
          strokeLinecap="round" className="gauge-fill"
          strokeDasharray={`${fill} ${circ - fill}`}
        />
      </svg>
      <div style={{ marginTop: -96, marginBottom: 0, textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--primary)", lineHeight: 1 }}>
          {score.toFixed(1)}
        </div>
        <div className="label" style={{ marginTop: 2 }}>/ 10</div>
      </div>
      <div style={{ height: 120 - 96 }} />
    </div>
  );
}
