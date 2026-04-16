import React, { useEffect, useState } from "react";
import { State } from "@/types";
import { useUser } from "@clerk/nextjs";
import { fetchWorkspaceReports } from "@/api/client";
import { LoadingView } from "./LoadingView";

export function WorkspaceView({ 
  setState, setReport, setBizName, setReviews 
}: { 
  setState: (s: State) => void,
  setReport: (r: any) => void,
  setBizName: (b: string) => void,
  setReviews: (r: any[]) => void
}) {
  const { user, isLoaded, isSignedIn } = useUser();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setState("setup");
      return;
    }
    
    if (isLoaded && isSignedIn && user?.id) {
      fetchWorkspaceReports(user.id)
        .then((rs) => {
          setReports(rs);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [isLoaded, isSignedIn, user, setState]);

  if (loading) return <LoadingView loadMsg="Cargando tu Workspace..." />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
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
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>
            Mi Workspace
          </div>
        </div>
      </header>
      
      <main className="w-full max-w-[720px] lg:max-w-5xl mx-auto px-6 py-12 lg:py-16">
        <h1 className="text-2xl lg:text-3xl font-bold mb-8 text-[var(--text)]">Tus Reportes Recientes</h1>
        {error && (
          <div style={{ color: "red", background: "var(--s1)", padding: 12, borderRadius: 4 }}>
            {error}
          </div>
        )}
        
        {!loading && !error && reports.length === 0 && (
          <div style={{ color: "var(--text-dim)" }}>
            Aún no has generado ningún reporte.
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6">
          {reports.map((r, i) => (
            <div 
              key={i} 
              className="card flex flex-col justify-between p-6 cursor-pointer border border-[var(--s2)] hover:bg-[#1a1a1a] hover-lift animate-fade-up" 
              style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}
              onClick={() => {
                setReport(r.report);
                setBizName(r.business_name || "");
                setReviews([]); // Optionally, we'd store reviews, but empty list works for displaying report since reviews length is read
                setState("report");
              }}
            >
              <div className="mb-4 flex-1">
                <div className="font-semibold text-[var(--text)] text-lg mb-1">{r.business_name || "Negocio Analizado"}</div>
                <div className="label">{r.report?.total_reviews_analyzed} reseñas · Score {r.report?.overall_score?.toFixed(1)}/10</div>
              </div>
              <div className="text-[#a1a1aa] text-sm flex items-center justify-between">
                <span>Ver análisis detallado</span>
                <span className="text-xl">→</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
