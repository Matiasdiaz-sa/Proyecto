"use client";
import React, { useState, useRef, useEffect } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────
interface Review { author: string; rating: number | null; text: string; datetime?: string; source?: string; }
interface Report {
  overall_score: number; sentiment_label: string;
  positive_themes: string[]; negative_themes: string[];
  executive_summary: string; recommendations: string[];
  language_detected: string; total_reviews_analyzed: number;
}
interface Msg { role: "user" | "assistant"; content: string; }
type State = "setup" | "loading" | "report" | "chat";

// ── Score Gauge ───────────────────────────────────────────────────────────────
function Gauge({ score }: { score: number }) {
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

// ── Typing dots ───────────────────────────────────────────────────────────────
function Dots() {
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

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div className={isUser ? "bubble-user" : "bubble-ai"} style={{
        maxWidth: "76%", padding: "10px 14px", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-wrap",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SLabel({ children }: { children: React.ReactNode }) {
  return <div className="label" style={{ marginBottom: 12 }}>{children}</div>;
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Div() { return <div style={{ height: 1, background: "var(--s2)", margin: "28px 0" }} />; }

// ── Main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState<State>("setup");
  const [bizName, setBizName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [limit, setLimit] = useState(50);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [tab, setTab] = useState<"pos" | "neg" | "rec">("pos");

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  // ── Analyze ───────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!mapsUrl.trim()) { setError("Ingresá la URL de Google Maps."); return; }
    setError(""); setState("loading");
    try {
      setLoadMsg("Extrayendo reseñas de Google Maps…");
      const r1 = await fetch(`${API}/reviews/scrape`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: mapsUrl, limit }),
      });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.detail ?? "Error al extraer reseñas");
      setReviews(d1.data);

      setLoadMsg(`Analizando ${d1.count} reseñas con IA…`);
      const r2 = await fetch(`${API}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: bizName || "el negocio", maps_url: mapsUrl, maps_limit: limit }),
      });
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.detail ?? "Error en análisis IA");
      setReport(d2.report);
      setState("report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setState("setup");
    } finally { setLoadMsg(""); }
  };

  // ── Start chat ────────────────────────────────────────────────────────────
  const startChat = () => {
    setMsgs([{
      role: "assistant",
      content: `Analicé ${reviews.length} reseñas de ${bizName || "el negocio"}.\n\nPuntaje general: ${report?.overall_score?.toFixed(1)}/10 — ${report?.sentiment_label}.\n\n¿Qué querés profundizar?`,
    }]);
    setState("chat");
  };

  // ── Send chat message ─────────────────────────────────────────────────────
  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || typing) return;
    const updated = [...msgs, { role: "user" as const, content: t }];
    setMsgs(updated); setInput(""); setTyping(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: t,
          business_name: bizName || "el negocio",
          conversation_history: updated.slice(0, -1),
          reviews, analysis_report: report,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail ?? "Error");
      setMsgs(p => [...p, { role: "assistant", content: d.reply }]);
    } catch (e) {
      setMsgs(p => [...p, { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "Error"}` }]);
    } finally {
      setTyping(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SETUP
  // ══════════════════════════════════════════════════════════════════════════
  if (state === "setup") return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
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

  // ══════════════════════════════════════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════════════════════════════════════
  if (state === "loading") return (
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

  // ══════════════════════════════════════════════════════════════════════════
  // REPORT
  // ══════════════════════════════════════════════════════════════════════════
  if (state === "report" && report) return (
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

  // ══════════════════════════════════════════════════════════════════════════
  // CHAT
  // ══════════════════════════════════════════════════════════════════════════
  const SUGGESTIONS = [
    "¿Qué problema se repite más en las quejas?",
    "Dame ejemplos de reseñas negativas",
    "¿Por qué el score es ese?",
    "Generá un plan de acción concreto",
    "¿Cómo respondo a los clientes insatisfechos?",
  ];

  return (
    <div style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        background: "rgba(19,19,19,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--s2)",
        padding: "0.75rem 1.25rem",
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
      }}>
        <button onClick={() => setState("report")} style={{
          background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer",
          fontSize: "1.1rem", padding: "2px 6px",
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", letterSpacing: "-0.01em" }}>
            {bizName || "el negocio"}
          </div>
          <div className="label">{reviews.length} reseñas · {report?.overall_score?.toFixed(1)}/10</div>
        </div>
        <button className="btn-ghost" onClick={() => setState("report")}>Ver informe</button>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m, i) => <Bubble key={i} msg={m} />)}
        {typing && <Dots />}
        <div ref={endRef} />
      </div>

      {/* Suggestions (first message only) */}
      {msgs.length === 1 && (
        <div style={{
          padding: "0 1.25rem 0.75rem",
          display: "flex", gap: 6, flexWrap: "wrap",
        }}>
          {SUGGESTIONS.map((q, i) => (
            <button key={i} className="suggestion-chip" onClick={() => send(q)}>{q}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        borderTop: "1px solid var(--s2)", background: "var(--s1)",
        padding: "0.875rem 1.25rem", flexShrink: 0,
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "flex-end", gap: 8 }}>
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="Preguntá sobre el informe…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            style={{
              flex: 1, background: "var(--s0)", border: "none",
              borderBottom: "1px solid var(--s4)", borderRadius: "4px 4px 0 0",
              color: "var(--text)", fontFamily: "inherit", fontSize: "0.9rem",
              padding: "10px 12px", outline: "none", resize: "none",
              maxHeight: 100, lineHeight: 1.5,
            }}
          />
          <button
            onClick={() => send()}
            disabled={typing || !input.trim()}
            style={{
              width: 38, height: 38, borderRadius: 4, border: "none",
              background: typing || !input.trim() ? "var(--s2)" : "var(--primary)",
              color: typing || !input.trim() ? "var(--text-dim)" : "var(--on-primary)",
              cursor: typing || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", fontWeight: 700, flexShrink: 0,
              transition: "background 0.15s",
            }}
          >↑</button>
        </div>
        <div className="label" style={{ textAlign: "center", marginTop: 6 }}>
          Enter para enviar · Shift+Enter para nueva línea
        </div>
      </div>
    </div>
  );
}
