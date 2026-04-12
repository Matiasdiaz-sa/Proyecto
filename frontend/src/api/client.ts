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

export async function analyzeBusiness(bizName: string, mapsUrl: string, limit: number, userId?: string): Promise<Report> {
    const res = await fetch(`${API}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: bizName || "el negocio", maps_url: mapsUrl, maps_limit: limit, user_id: userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Error en análisis IA");
    return data.report;
}

export async function sendChatMessageStream(
    message: string,
    bizName: string,
    history: Msg[],
    reviews: Review[],
    report: Report | null,
    onWord: (text: string) => void
): Promise<void> {
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
    
    if (!res.ok) {
        let msg = "Error en el chat";
        try {
            const data = await res.json();
            msg = data.detail ?? msg;
        } catch(e) {}
        throw new Error(msg);
    }
    
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;
    
    let content = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') break;
                try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.content) {
                        content += parsed.content;
                        onWord(content);
                    }
                } catch(e) {}
            }
        }
    }
}

export async function fetchWorkspaceReports(userId: string): Promise<any[]> {
    const res = await fetch(`${API}/reports/${userId}`, {
        method: "GET", headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Error cargando el workspace");
    return data.reports;
}
