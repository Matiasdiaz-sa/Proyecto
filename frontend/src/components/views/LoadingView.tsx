import React, { useState, useEffect } from "react";

const LOADING_STEPS = [
  "Conectando con herramientas externas...",
  "Descargando reseñas y datos del negocio...",
  "Analizando sentimiento con IA avanzada...",
  "Calculando métricas y puntos fuertes...",
  "Generando plan de acción profesional...",
];

export function LoadingView({ loadMsg }: { loadMsg: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const int = setInterval(() => {
      setStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 4500);
    return () => clearInterval(int);
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem",
    }}>
      <div className="pulse" style={{ fontSize: "2rem" }}>◎</div>
      <div style={{ fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text)" }}>
        {loadMsg || "Procesando…"}
      </div>
      <div className="label pulse" style={{ opacity: 0.8, marginTop: "-0.5rem" }}>
        {LOADING_STEPS[step]}
      </div>
    </div>
  );
}
