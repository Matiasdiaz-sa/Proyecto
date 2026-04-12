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
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem",
    }}>
      {/* Top Header */}
      <div style={{ width: "100%", maxWidth: 800, display: "flex", justifyContent: "flex-end", gap: 16, marginBottom: 40 }}>
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

      <div style={{ width: "100%", maxWidth: 440, marginTop: "2rem" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 8, background: "var(--s2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem", margin: "0 auto 16px",
          }}>◎</div>
          <div style={{ fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>
            Analista de Reseñas
          </div>
          <div className="label" style={{ marginTop: 4 }}>Powered by AI</div>
        </div>

        {/* Card */}
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
            <div className="label" style={{ marginBottom: 8 }}>Reseñas a analizar</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[20, 50, 100, 200, 300].map(n => (
                <button
                  key={n}
                  onClick={() => setLimit(n)}
                  className={limit === n ? "chip chip-selected" : "chip"}
                  style={{ cursor: "pointer", border: "none", flex: 1, justifyContent: "center" }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="label" style={{ marginTop: 6, textAlign: "right" }}>
              {limit <= 20 ? "~30s" : limit <= 50 ? "~45s" : limit <= 100 ? "~60s" : limit <= 200 ? "~90s" : "~2min"}
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
  );
}
