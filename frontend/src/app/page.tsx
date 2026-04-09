"use client";
import React, { useState, useRef, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:8000/api/v1";

interface Review {
  author: string;
  rating: number | null;
  text: string;
  datetime: string;
  source?: string;
}

interface AnalysisReport {
  overall_score: number;
  sentiment_label: string;
  positive_themes: string[];
  negative_themes: string[];
  executive_summary: string;
  recommendations: string[];
  language_detected: string;
  total_reviews_analyzed: number;
  sources_used: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

type AppState = "setup" | "analyzing" | "report" | "chat";

// ── Score Gauge ──────────────────────────────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 7.5 ? "#22c55e" : score >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#27272a" strokeWidth="12" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${2.64 * pct} ${264 - 2.64 * pct}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{score.toFixed(1)}</span>
          <span className="text-[10px] text-zinc-500">/10</span>
        </div>
      </div>
    </div>
  );
}

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-xs shrink-0">🔍</div>
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${isUser ? "bg-zinc-700" : "bg-gradient-to-br from-blue-500 to-emerald-500"}`}>
        {isUser ? "👤" : "🔍"}
      </div>
      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isUser
        ? "bg-blue-600 text-white rounded-br-sm"
        : "bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-bl-sm"
      }`}>
        {msg.content}
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [appState, setAppState] = useState<AppState>("setup");
  const [businessName, setBusinessName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [mapsLimit, setMapsLimit] = useState(50);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [activeTab, setActiveTab] = useState<"positivo" | "negativo" | "recomendaciones">("positivo");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Step 1: Load reviews + analyze ────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!mapsUrl) { setError("Ingresá la URL de Google Maps."); return; }
    setError("");
    setAppState("analyzing");

    try {
      // Load reviews
      setLoadingMsg("Extrayendo reseñas de Google Maps...");
      const scrapeRes = await fetch(`${API_URL}/reviews/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: mapsUrl, limit: mapsLimit }),
      });
      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok) throw new Error(scrapeData.detail || "Error al extraer reseñas");
      const loadedReviews: Review[] = scrapeData.data;
      setReviews(loadedReviews);

      // Run AI analysis
      setLoadingMsg(`Analizando ${loadedReviews.length} reseñas con IA...`);
      const analyzeRes = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName || "el negocio",
          maps_url: mapsUrl,
          maps_limit: mapsLimit,
        }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.detail || "Error en análisis IA");

      setReport(analyzeData.report);
      setAppState("report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setAppState("setup");
    } finally {
      setLoadingMsg("");
    }
  };

  // ── Step 2: Start chat using the report as context ────────────────────────
  const startChat = () => {
    setMessages([{
      role: "assistant",
      content: `¡Hola! Acabo de analizar **${reviews.length} reseñas** de **${businessName || "el negocio"}**.\n\nEl puntaje general es **${report?.overall_score?.toFixed(1)}/10** (${report?.sentiment_label}).\n\n¿Qué querés profundizar? Podés preguntarme sobre los temas más frecuentes, pedirme que desarrolle algún punto del informe, o que te proponga estrategias concretas.`,
    }]);
    setAppState("chat");
  };

  // ── Send chat message ─────────────────────────────────────────────────────
  const sendMessage = async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || isTyping) return;

    const userMsg: Message = { role: "user", content: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const history = newMessages.slice(0, -1);
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgText,
          business_name: businessName || "el negocio",
          conversation_history: history,
          reviews: reviews,
          analysis_report: report,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error");
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ ${e instanceof Error ? e.message : "Error al procesar tu pregunta."}`,
      }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: SETUP
  // ────────────────────────────────────────────────────────────────────────────
  if (appState === "setup") return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-2xl">🔍</div>
          <h1 className="text-2xl font-black text-white">Analista de Reseñas IA</h1>
          <p className="text-zinc-400 text-sm">Cargá un negocio, obtenés el informe y después conversás con la IA</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nombre del negocio (opcional)</label>
            <input type="text" placeholder="Ej: TESEO Restaurante Bar" value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">URL de Google Maps *</label>
            <input type="text" placeholder="https://maps.app.goo.gl/..." value={mapsUrl}
              onChange={e => setMapsUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAnalyze()}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Reseñas a analizar</label>
            <select value={mapsLimit} onChange={e => setMapsLimit(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
              <option value={20}>20 (rápido ~30s)</option>
              <option value={50}>50 (~45s)</option>
              <option value={100}>100 (~60s)</option>
              <option value={200}>200 (~90s)</option>
              <option value={300}>300 máx (~2min)</option>
            </select>
          </div>
          {error && <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-red-300 text-xs">⚠️ {error}</div>}
          <button onClick={handleAnalyze}
            className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white transition-all">
            🚀 Analizar negocio
          </button>
        </div>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: ANALYZING (loading)
  // ────────────────────────────────────────────────────────────────────────────
  if (appState === "analyzing") return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-3xl animate-pulse">🔍</div>
        <p className="text-white font-semibold">{loadingMsg || "Procesando..."}</p>
        <p className="text-zinc-500 text-sm">Esto puede tardar hasta 2 minutos dependiendo de la cantidad de reseñas</p>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: REPORT
  // ────────────────────────────────────────────────────────────────────────────
  if (appState === "report" && report) return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setAppState("setup")} className="text-zinc-500 hover:text-zinc-300 text-sm">←</button>
          <span className="text-sm font-semibold">{businessName || "el negocio"}</span>
          <span className="text-xs text-zinc-500">{reviews.length} reseñas</span>
        </div>
        <button onClick={startChat}
          className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all">
          💬 Conversar sobre este informe →
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Score card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row gap-5 items-center">
          <ScoreGauge score={report.overall_score} />
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1 rounded-full">🌐 {report.language_detected}</span>
              <span className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1 rounded-full">📊 {report.total_reviews_analyzed} reseñas analizadas</span>
            </div>
            <h2 className="text-lg font-bold">{report.sentiment_label}</h2>
            <p className="text-zinc-300 text-sm leading-relaxed">{report.executive_summary}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex border-b border-zinc-800">
            {(["positivo", "negativo", "recomendaciones"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-xs font-semibold transition-colors ${activeTab === tab
                  ? "bg-zinc-800 text-white border-b-2 border-blue-500"
                  : "text-zinc-500 hover:text-zinc-300"}`}>
                {tab === "positivo" ? "✅ Puntos fuertes" : tab === "negativo" ? "⚠️ Áreas de mejora" : "💡 Recomendaciones"}
              </button>
            ))}
          </div>
          <div className="p-5">
            {activeTab === "positivo" && (
              <ul className="space-y-2">{report.positive_themes?.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-zinc-200"><span className="text-emerald-400 shrink-0">✓</span>{t}</li>
              ))}</ul>
            )}
            {activeTab === "negativo" && (
              <ul className="space-y-2">{report.negative_themes?.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-zinc-200"><span className="text-red-400 shrink-0">✗</span>{t}</li>
              ))}</ul>
            )}
            {activeTab === "recomendaciones" && (
              <ol className="space-y-3">{report.recommendations?.map((r, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-200">
                  <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>{r}
                </li>
              ))}</ol>
            )}
          </div>
        </div>

        {/* CTA */}
        <button onClick={startChat}
          className="w-full py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white transition-all">
          💬 Conversar sobre este informe
        </button>
      </main>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: CHAT
  // ────────────────────────────────────────────────────────────────────────────
  const SUGGESTIONS = [
    "¿Qué problema se repite más en las quejas?",
    "Dame más detalle sobre los puntos fuertes",
    "¿Por qué el score es ese? Dame ejemplos",
    "Generá un plan de acción para el mes que viene",
    "¿Cómo respondo a los clientes insatisfechos?",
    "¿Qué aspectos destaca la gente más joven?",
  ];

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => setAppState("report")} className="text-zinc-500 hover:text-zinc-300 text-sm">←</button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-sm shrink-0">🔍</div>
        <div>
          <p className="text-sm font-semibold leading-tight">{businessName || "el negocio"}</p>
          <p className="text-xs text-zinc-500">{reviews.length} reseñas · Score {report?.overall_score?.toFixed(1)}/10</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {SUGGESTIONS.map((q, i) => (
            <button key={i} onClick={() => sendMessage(q)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-full px-3 py-1.5 transition-colors">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-zinc-800 bg-zinc-900 px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea ref={inputRef} rows={1} placeholder="Preguntá sobre el informe..."
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            style={{ maxHeight: "120px" }} />
          <button onClick={() => sendMessage()} disabled={isTyping || !input.trim()}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${isTyping || !input.trim() ? "bg-zinc-800 text-zinc-600" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>↑</button>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-1">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  );
}
