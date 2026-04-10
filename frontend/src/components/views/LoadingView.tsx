import React from "react";

export function LoadingView({ loadMsg }: { loadMsg: string }) {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem",
    }}>
      <div className="pulse" style={{ fontSize: "2rem" }}>◎</div>
      <div style={{ fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text)" }}>
        {loadMsg || "Procesando…"}
      </div>
      <div className="label">Este proceso puede tomar hasta 2 minutos</div>
    </div>
  );
}
