"use client";
import React, { useState } from "react";
import { Review, Report, Msg, State } from "@/types";
import { analyzeBusiness, scrapeReviews, sendChatMessageStream } from "@/api/client";
import { SetupView } from "@/components/views/SetupView";
import { LoadingView } from "@/components/views/LoadingView";
import { ReportView } from "@/components/views/ReportView";
import { ChatView } from "@/components/views/ChatView";

export default function App() {
  const [state, setState] = useState<State>("setup");
  const [bizName, setBizName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [limit, setLimit] = useState(50);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [report, setReport] = useState<Report | null>(null);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const handleAnalyze = async () => {
    if (!mapsUrl.trim()) { setError("Ingresá la URL de Google Maps."); return; }
    setError(""); setState("loading");
    try {
      setLoadMsg("Extrayendo reseñas de Google Maps…");
      const d1 = await scrapeReviews(mapsUrl, limit);
      setReviews(d1.data);

      setLoadMsg(`Analizando ${d1.count} reseñas con IA…`);
      const d2 = await analyzeBusiness(bizName, mapsUrl, limit);
      setReport(d2);
      setState("report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setState("setup");
    } finally { setLoadMsg(""); }
  };

  const startChat = () => {
    setMsgs([{
      role: "assistant",
      content: `Analicé ${reviews.length} reseñas de ${bizName || "el negocio"}.\n\nPuntaje general: ${report?.overall_score?.toFixed(1)}/10 — ${report?.sentiment_label}.\n\n¿Qué querés profundizar?`,
    }]);
    setState("chat");
  };

  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || typing) return;
    const updated = [...msgs, { role: "user" as const, content: t }];
    setMsgs([...updated, { role: "assistant", content: "" }]); 
    setInput(""); setTyping(true);
    try {
      await sendChatMessageStream(t, bizName, msgs, reviews, report, (content) => {
        setMsgs(p => {
          const newMsgs = [...p];
          newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content };
          return newMsgs;
        });
      });
    } catch (e) {
      setMsgs(p => {
        const newMsgs = [...p];
        const last = newMsgs[newMsgs.length - 1];
        newMsgs[newMsgs.length - 1] = { 
          ...last, 
          content: last.content + (last.content ? `\n\n` : "") + `⚠️ ${e instanceof Error ? e.message : "Error"}`
        };
        return newMsgs;
      });
    } finally {
      setTyping(false);
    }
  };

  if (state === "setup") return (
    <SetupView 
      bizName={bizName} setBizName={setBizName} 
      mapsUrl={mapsUrl} setMapsUrl={setMapsUrl} 
      limit={limit} setLimit={setLimit} 
      error={error} handleAnalyze={handleAnalyze} 
    />
  );

  if (state === "loading") return <LoadingView loadMsg={loadMsg} />;

  if (state === "report" && report) return (
    <ReportView 
      report={report} bizName={bizName} 
      reviews={reviews} setState={setState} startChat={startChat} 
    />
  );

  if (state === "chat") return (
    <ChatView 
      bizName={bizName} reviews={reviews} report={report} 
      setState={setState} msgs={msgs} typing={typing} 
      send={send} input={input} setInput={setInput} 
    />
  );

  return null;
}
