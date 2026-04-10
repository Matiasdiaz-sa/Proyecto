import { Review, Report, Msg } from "@/types";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");

export async function scrapeReviews(url: string, limit: number): Promise<{ data: Review[]; count: number }> {
    const res = await fetch(`${API}/reviews/scrape`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, limit }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Error al extraer reseñas");
    return data;
}

export async function analyzeBusiness(bizName: string, mapsUrl: string, limit: number): Promise<Report> {
    const res = await fetch(`${API}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: bizName || "el negocio", maps_url: mapsUrl, maps_limit: limit }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Error en análisis IA");
    return data.report;
}

export async function sendChatMessage(
    message: string,
    bizName: string,
    history: Msg[],
    reviews: Review[],
    report: Report | null
): Promise<string> {
    const res = await fetch(`${API}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message,
            business_name: bizName || "el negocio",
            conversation_history: history,
            reviews,
            analysis_report: report,
        }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Error en el chat");
    return data.reply;
}
