"use client";
import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  // Remove object any typing to avoid ESLint strict errors
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const testScraper = async () => {
    if (!url) return;
    setLoading(true);
    setResult(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiUrl}/reviews/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, limit: 5 }) 
      });
      const data = await res.json();
      setResult(data as Record<string, unknown>);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Error desconocido";
      setResult({ error: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans text-zinc-100 p-6">
      <div className="max-w-2xl w-full flex flex-col items-center space-y-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-10 shadow-2xl">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Análisis de Sentimientos
          </h1>
          <p className="text-zinc-400 text-lg">
            Plataforma impulsada por Inteligencia Artificial
          </p>
        </div>

        {/* Input UI */}
        <div className="w-full bg-zinc-950 rounded-xl p-8 border border-zinc-800 flex flex-col space-y-4">
          <h2 className="text-xl font-semibold mb-2 text-center">Extracción de Google Maps</h2>
          <p className="text-zinc-500 text-sm text-center mb-4">
            Pega un enlace de Google Maps aquí abajo. Nuestro servidor se conectará en vivo y extraerá de forma &quot;Scraper&quot; las reseñas reales del local.
          </p>
          <input
            type="text"
            className="w-full bg-zinc-900 text-white p-4 rounded-lg outline-none border border-zinc-700 focus:border-blue-500 transition-colors"
            placeholder="https://maps.app.goo.gl/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button 
            className={`w-full p-4 rounded-lg font-bold shadow-lg transition-all ${loading ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
            onClick={testScraper}
            disabled={loading}
          >
            {loading ? "Infiltrando bot en Google Maps (Espere 20s)..." : "Extraer Reseñas con Apify"}
          </button>
        </div>

        {/* Resultados */}
        {result && (
          <div className="w-full bg-zinc-950 rounded-xl p-6 border border-zinc-800 overflow-hidden">
            <h3 className="font-semibold text-emerald-400 mb-2">📋 Respuesta recibida en JSON:</h3>
            <pre className="bg-zinc-900 p-4 rounded-lg text-xs text-zinc-300 overflow-auto max-h-96 custom-scrollbar whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}
