import React, { useState } from "react";
import { Report, Review, State } from "@/types";
import { Gauge } from "@/components/ui/Gauge";
import { Div } from "@/components/ui/Div";

interface Props {
  report: Report;
  bizName: string;
  reviews: Review[];
  setState: (s: State) => void;
  startChat: () => void;
}

export function ReportView({ report, bizName, reviews, setState, startChat }: Props) {
  const [tab, setTab] = useState<"pos" | "neg" | "rec">("pos");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(19,19,19,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--s2)",
        padding: "0.875rem 1.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setState("setup")} style={{
            background: "none", border: "none", color: "var(--text-dim)",
            cursor: "pointer", fontSize: "1.1rem", padding: "2px 6px",
          }}>←</button>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>
              {bizName || "el negocio"}
            </div>
            <div className="label">{reviews.length} reseñas analizadas</div>
          </div>
        </div>
        <button className="btn-ghost" onClick={startChat}>
          Conversar con el informe →
        </button>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem" }}>
        {/* Score hero */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <Gauge score={report.overall_score} />
          <div style={{
            fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em",
            marginTop: 24, color: "var(--text)",
          }}>
            {report.sentiment_label}
          </div>
          <div style={{
            maxWidth: 520, margin: "12px auto 0", color: "var(--text-muted)",
            fontSize: "0.9rem", lineHeight: 1.65,
          }}>
            {report.executive_summary}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
            <span className="chip">🌐 {report.language_detected}</span>
            <span className="chip">📊 {report.total_reviews_analyzed} analizadas</span>
          </div>
        </div>

        <Div />

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--s2)", marginBottom: "1.75rem" }}>
          <button className={tab === "pos" ? "tab active" : "tab"} onClick={() => setTab("pos")}>Puntos fuertes</button>
          <button className={tab === "neg" ? "tab active" : "tab"} onClick={() => setTab("neg")}>Áreas de mejora</button>
          <button className={tab === "rec" ? "tab active" : "tab"} onClick={() => setTab("rec")}>Recomendaciones</button>
        </div>

        {tab === "pos" && (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 16 }}>
            {report.positive_themes.map((t, i) => (
              <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: "var(--text-dim)", fontWeight: 700, fontSize: "0.75rem", marginTop: 3 }}>0{i + 1}</span>
                <span style={{ color: "var(--text)", fontSize: "0.9375rem", lineHeight: 1.5 }}>{t}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === "neg" && (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 16 }}>
            {report.negative_themes.map((t, i) => (
              <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: "var(--text-dim)", fontWeight: 700, fontSize: "0.75rem", marginTop: 3 }}>0{i + 1}</span>
                <span style={{ color: "var(--text)", fontSize: "0.9375rem", lineHeight: 1.5 }}>{t}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === "rec" && (
          <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 20 }}>
            {report.recommendations.map((r, i) => (
              <li key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 4, background: "var(--s2)",
                  color: "var(--text)", fontSize: "0.75rem", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{ color: "var(--text)", fontSize: "0.9375rem", lineHeight: 1.55, paddingTop: 4 }}>{r}</span>
              </li>
            ))}
          </ol>
        )}

        <Div />

        <button className="btn-primary" onClick={startChat}>
          Conversar sobre este informe →
        </button>
      </main>
    </div>
  );
}
