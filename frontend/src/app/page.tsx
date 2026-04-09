"use client";
import React, { useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:8000/api/v1";

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
  total_reviews_combined: number;
}

function ScoreGauge({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 7.5 ? "#22c55e" : score >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#27272a" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${2.64 * pct} ${264 - 2.64 * pct}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-3xl font-black" style={{ color }}>{score.toFixed(1)}</span>
          <span className="text-xs text-zinc-400">/ 10</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{score >= 7.5 ? "😊" : score >= 5 ? "😐" : "😟"}</span>
    </div>
  );
}

export default function Home() {
  const [businessName, setBusinessName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [mapsLimit, setMapsLimit] = useState(50);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"positivo" | "negativo" | "recomendaciones">("positivo");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (!mapsUrl && !websiteUrl && !manualText && !uploadFile) {
      setError("Ingresá al menos una fuente de reseñas (Maps URL, sitio web, texto o archivo).");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      // If file upload, use upload endpoint
      if (uploadFile) {
        setLoadingMsg("Subiendo archivo y extrayendo reseñas...");
        const form = new FormData();
        form.append("file", uploadFile);
        form.append("business_name", businessName || "el negocio");
        form.append("maps_url", mapsUrl || "");
        form.append("maps_limit", String(mapsLimit));
        const res = await fetch(`${API_URL}/analyze/upload`, { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error en análisis");
        setReport(data.report);
        return;
      }

      setLoadingMsg(`Recopilando reseñas de ${[mapsUrl && "Google Maps", websiteUrl && "el sitio web", manualText && "texto manual"].filter(Boolean).join(", ")}...`);
      
      const manualReviews = manualText
        ? manualText.split("\n").map(l => l.trim()).filter(l => l.length > 20)
        : [];

      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName || "el negocio",
          maps_url: mapsUrl || null,
          maps_limit: mapsLimit,
          website_url: websiteUrl || null,
          manual_reviews: manualReviews,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error en análisis");
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent leading-tight">
              Analista de Reseñas IA
            </h1>
            <p className="text-xs text-zinc-500">Análisis profesional multi-fuente con OpenAI</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Configuration card */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-zinc-200">⚙️ Configuración del análisis</h2>

          {/* Business name */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nombre del negocio (opcional)</label>
            <input
              type="text"
              placeholder="Ej: TESEO Restaurante Bar"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Maps URL + limit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-400 mb-1 block">🗺️ URL de Google Maps</label>
              <input
                type="text"
                placeholder="https://maps.app.goo.gl/... o URL larga de Maps"
                value={mapsUrl}
                onChange={e => setMapsUrl(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Reseñas a extraer</label>
              <select
                value={mapsLimit}
                onChange={e => setMapsLimit(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={20}>20 (rápido)</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={300}>300 (máximo)</option>
              </select>
            </div>
          </div>

          {/* Website URL */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">🌐 Sitio web del negocio (opcional)</label>
            <input
              type="text"
              placeholder="https://www.mi-restaurante.com"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Manual text */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">✏️ Reseñas manuales (una por línea)</label>
            <textarea
              placeholder={"La comida estuvo excelente, muy recomendable.\nEl servicio fue lento pero la comida compensó.\n..."}
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* File upload */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">📄 Subir archivo de reseñas (TXT o CSV)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-blue-500 rounded-lg p-5 text-center cursor-pointer transition-colors"
            >
              {uploadFile
                ? <span className="text-emerald-400 text-sm font-medium">✅ {uploadFile.name}</span>
                : <span className="text-zinc-500 text-sm">Clic para seleccionar archivo (TXT, CSV)</span>
              }
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={e => setUploadFile(e.target.files?.[0] || null)}
            />
            {uploadFile && (
              <button
                onClick={() => { setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="mt-1 text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                × Quitar archivo
              </button>
            )}
          </div>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all shadow-lg ${loading
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin text-lg">⚙️</span>
                {loadingMsg || "Analizando..."}
              </span>
            ) : "🚀 Analizar con IA"}
          </button>

          {error && (
            <div className="bg-red-950/50 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* Report */}
        {report && (
          <section className="space-y-4 animate-fade-in">

            {/* Score + summary row */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
              <ScoreGauge score={report.overall_score} />
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1 rounded-full">
                    🌐 {report.language_detected}
                  </span>
                  <span className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1 rounded-full">
                    📊 {report.total_reviews_analyzed} reseñas analizadas
                  </span>
                  {report.sources_used?.map((s, i) => (
                    <span key={i} className="bg-blue-950/50 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-800">
                      {s}
                    </span>
                  ))}
                </div>
                <h3 className="text-lg font-bold">{report.sentiment_label}</h3>
                <p className="text-zinc-300 text-sm leading-relaxed">{report.executive_summary}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex border-b border-zinc-800">
                {(["positivo", "negativo", "recomendaciones"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors capitalize ${activeTab === tab
                      ? "bg-zinc-800 text-white border-b-2 border-blue-500"
                      : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab === "positivo" ? "✅ Puntos fuertes" : tab === "negativo" ? "⚠️ Áreas de mejora" : "💡 Recomendaciones"}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {activeTab === "positivo" && (
                  <ul className="space-y-2">
                    {report.positive_themes?.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-200">
                        <span className="text-emerald-400 mt-0.5">✓</span> {t}
                      </li>
                    ))}
                  </ul>
                )}
                {activeTab === "negativo" && (
                  <ul className="space-y-2">
                    {report.negative_themes?.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-200">
                        <span className="text-red-400 mt-0.5">✗</span> {t}
                      </li>
                    ))}
                  </ul>
                )}
                {activeTab === "recomendaciones" && (
                  <ol className="space-y-3">
                    {report.recommendations?.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-zinc-200">
                        <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {r}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

          </section>
        )}
      </main>
    </div>
  );
}
