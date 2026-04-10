import React from "react";

export function Dots() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
      <div style={{
        background: "var(--s2)", borderRadius: 12, padding: "10px 14px",
        display: "flex", gap: 4, alignItems: "center",
      }}>
        {[0, 160, 320].map(d => (
          <span key={d} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--text-dim)",
            display: "block",
            animation: `pulse-breath 1.2s ${d}ms ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}
