"use client";
import React, { useState, useRef, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:8000/api/v1";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface LoadedBusiness {
  name: string;
  mapsUrl: string;
  reviewsLoaded: number;
  reviews: Record<string, unknown>[];
}

const SUGGESTED_QUESTIONS = [
  "¿Cuál es el problema más frecuente que mencionan los clientes?",
  "¿Qué aspectos del negocio elogian más?",
  "Dame un resumen ejecutivo de la reputación online",
  "¿Qué tan consistente es la calidad del servicio?",
  "Generá 3 recomendaciones concretas de mejora",
  "¿Cómo perciben el precio/calidad los clientes?",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-xs">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-xs shrink-0">
        🔍
      </div>
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${isUser
        ? "bg-zinc-700"
        : "bg-gradient-to-br from-blue-500 to-emerald-500"
      }`}>
        {isUser ? "👤" : "🔍"}
      </div>
      {/* Bubble */}
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isUser
        ? "bg-blue-600 text-white rounded-br-sm"
        : "bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-bl-sm"
      }`}>
        {message.content}
      </div>
    </div>
  );
}

export default function Home() {
  // Setup state
  const [setupDone, setSetupDone] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [mapsLimit, setMapsLimit] = useState(50);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [business, setBusiness] = useState<LoadedBusiness | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSetup = async () => {
    if (!mapsUrl) {
      setSetupError("Ingresá la URL de Google Maps del negocio.");
      return;
    }
    setLoadingSetup(true);
    setSetupError("");
    try {
      // Load reviews via scrape endpoint first
      const res = await fetch(`${API_URL}/reviews/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: mapsUrl, limit: mapsLimit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al cargar reseñas");

      const loaded: LoadedBusiness = {
        name: businessName || "el negocio",
        mapsUrl,
        reviewsLoaded: data.count,
        reviews: data.data,
      };
      setBusiness(loaded);
      setSetupDone(true);

      // Initial greeting from assistant
      setMessages([
        {
          role: "assistant",
          content: `¡Hola! Soy tu analista de reseñas. Cargué **${data.count} reseñas** de **${loaded.name}** desde Google Maps.\n\n¿Qué querés saber? Podés preguntarme sobre la reputación del negocio, los puntos fuertes, las quejas más frecuentes, o pedirme un plan de mejora.`,
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoadingSetup(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || isTyping || !business) return;

    const userMsg: Message = { role: "user", content: msgText, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const history = newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgText,
          business_name: business.name,
          conversation_history: history,
          reviews: business.reviews,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error del servidor");

      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      const errMsg: Message = {
        role: "assistant",
        content: `⚠️ Error: ${e instanceof Error ? e.message : "No pude procesar tu pregunta. Intentá de nuevo."}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── SETUP SCREEN ────────────────────────────────────────────────────────────
  if (!setupDone) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-3xl">
              🔍
            </div>
            <h1 className="text-2xl font-black text-white">Analista de Reseñas IA</h1>
            <p className="text-zinc-400 text-sm">Cargá un negocio para empezar el análisis conversacional</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Nombre del negocio (opcional)</label>
              <input
                type="text"
                placeholder="Ej: TESEO Restaurante Bar"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">URL de Google Maps *</label>
              <input
                type="text"
                placeholder="https://maps.app.goo.gl/..."
                value={mapsUrl}
                onChange={e => setMapsUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSetup()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Reseñas a cargar</label>
              <select
                value={mapsLimit}
                onChange={e => setMapsLimit(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value={20}>20 (rápido ~15s)</option>
                <option value={50}>50 (~25s)</option>
                <option value={100}>100 (~40s)</option>
                <option value={200}>200 (~70s)</option>
                <option value={300}>300 máximo (~2min)</option>
              </select>
            </div>

            {setupError && (
              <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-red-300 text-xs">
                ⚠️ {setupError}
              </div>
            )}

            <button
              onClick={handleSetup}
              disabled={loadingSetup}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${loadingSetup
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white"
              }`}
            >
              {loadingSetup
                ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⚙️</span> Cargando reseñas...</span>
                : "Iniciar análisis →"}
            </button>
          </div>
          <p className="text-center text-xs text-zinc-600">Las reseñas se guardan en MongoDB automáticamente.</p>
        </div>
      </div>
    );
  }

  // ── CHAT SCREEN ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => { setSetupDone(false); setMessages([]); setBusiness(null); }}
          className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
        >
          ←
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-sm">
          🔍
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">{business?.name}</p>
          <p className="text-xs text-zinc-500">{business?.reviewsLoaded} reseñas cargadas · Analista IA</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions (show only at start) */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-full px-3 py-1.5 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-800 bg-zinc-900 px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="Preguntá algo sobre las reseñas..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isTyping || !input.trim()}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${isTyping || !input.trim()
              ? "bg-zinc-800 text-zinc-600"
              : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            ↑
          </button>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-1">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  );
}
