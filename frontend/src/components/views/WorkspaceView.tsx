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
      
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem", width: "100%" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>Tus Reportes Recientes</h1>
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
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {reports.map((r, i) => (
            <div 
              key={i} 
              className="card" 
              onClick={() => {
                setReport(r.report);
                setBizName(r.business_name || "");
                setReviews([]); // Optionally, we'd store reviews, but empty list works for displaying report since reviews length is read
                setState("report");
              }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", cursor: "pointer", border: "1px solid var(--s2)" }}
            >
              <div>
                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "1.1rem" }}>{r.business_name || "Negocio Analizado"}</div>
                <div className="label">{r.report?.total_reviews_analyzed} reseñas · Score {r.report?.overall_score?.toFixed(1)}</div>
              </div>
              <div style={{ fontSize: "1.5rem", opacity: 0.5 }}>→</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
