import React from "react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

interface Props {
  bizName: string; setBizName: (v: string) => void;
  mapsUrl: string; setMapsUrl: (v: string) => void;
  limit: number; setLimit: (v: number) => void;
  error: string;
  handleAnalyze: () => void;
  openWorkspace: () => void;
}

export function SetupView({ bizName, setBizName, mapsUrl, setMapsUrl, limit, setLimit, error, handleAnalyze, openWorkspace }: Props) {
  const { isSignedIn, user } = useUser();
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column",
      padding: "1.5rem"
    }}>
      {/* Top Header */}
      <div style={{
        width: "100%", maxWidth: 1000, margin: "0 auto", 
        display: "flex", justifyContent: "flex-end", gap: 16
      }}>
        {isSignedIn ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className="label" style={{ textTransform: "none", color: "var(--text)" }}>Hola, {user.firstName || "Usuario"}</span>
            <button className="btn-ghost" onClick={openWorkspace}>Mi Workspace</button>
            <UserButton />
          </div>
        ) : (
          <SignInButton mode="modal">
            <button className="btn-ghost">Iniciar Sesión</button>
          </SignInButton>
        )}
      </div>

      <div className="setup-container animate-fade-up">
        
        {/* Left Column: Branding / Hero */}
        <div className="setup-hero">
          <div style={{
            width: 48, height: 48, borderRadius: 8, background: "var(--s2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem"
          }} className="hero-icon">◎</div>
          <div style={{ fontSize: "2.25rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: 8 }}>
            Analista de Reseñas
          </div>
          <div className="label">Powered by AI</div>
          
          <div className="setup-desc" style={{ marginTop: 32, color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: 400 }}>
            Transforma la opinión de tus clientes en información accionable. Nuestro motor de IA procesa y categoriza rápidamente cientos de reseñas de Google Maps para darte un resumen ejecutivo y recomendaciones claras.
          </div>
        </div>

        {/* Right Column: Setup Card */}
        <div className="animate-fade-up-delay-1" style={{ width: "100%", maxWidth: 440, flexShrink: 0 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Nombre del negocio</div>
            <input
              className="ghost-input"
              type="text"
              placeholder="Ej: TESEO Restaurante Bar"
              value={bizName}
              onChange={e => setBizName(e.target.value)}
            />
          </div>

          <div>
            <div className="label" style={{ marginBottom: 8 }}>URL de Google Maps *</div>
            <input
              className="ghost-input"
              type="text"
              placeholder="https://maps.app.goo.gl/…"
              value={mapsUrl}
              onChange={e => setMapsUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAnalyze()}
            />
          </div>

          <div>
            <div className="label" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Reseñas a analizar</span>
              <span style={{ color: "var(--text)" }}>{limit} max</span>
            </div>
            <input 
              type="range" 
              min="20" 
              max="1000" 
              step="10" 
              value={limit} 
              onChange={e => setLimit(Number(e.target.value))}
              className="range-slider"
            />
            <div className="label" style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span>Rápido</span>
              <span>
                {limit <= 50 ? "~30s" : limit <= 100 ? "~45s" : limit <= 300 ? "~60s" : limit <= 500 ? "~90s" : limit <= 800 ? "~2m" : "~3m"}
              </span>
            </div>
          </div>

          {error && (
            <div style={{
              background: "var(--s0)", borderLeft: "2px solid var(--text-dim)",
              padding: "10px 12px", borderRadius: 4, fontSize: "0.8125rem", color: "var(--text-muted)",
            }}>
              {error}
            </div>
          )}

          <button className="btn-primary" onClick={handleAnalyze}>
            Analizar negocio →
          </button>
        </div>

        <div className="label" style={{ textAlign: "center", marginTop: "1.5rem" }}>
          Las reseñas se guardan automáticamente
        </div>
        </div>
      </div>
    </div>
  );
}
