import React, { useRef, useEffect } from "react";
import { State, Msg, Report, Review } from "@/types";
import { Bubble } from "@/components/chat/Bubble";
import { Dots } from "@/components/ui/Dots";

interface Props {
  bizName: string;
  reviews: Review[];
  report: Report | null;
  setState: (s: State) => void;
  msgs: Msg[];
  typing: boolean;
  send: (text?: string) => void;
  input: string;
  setInput: (v: string) => void;
}

const SUGGESTIONS = [
  "¿Qué problema se repite más en las quejas?",
  "Dame ejemplos de reseñas negativas",
  "¿Por qué el score es ese?",
  "Generá un plan de acción concreto",
  "¿Cómo respondo a los clientes insatisfechos?",
];

export function ChatView({ bizName, reviews, report, setState, msgs, typing, send, input, setInput }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

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

      {/* Suggestions */}
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
