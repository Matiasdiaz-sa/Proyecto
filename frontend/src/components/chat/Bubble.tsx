import React, { useState } from "react";
import { Msg } from "@/types";

export function Bubble({ msg }: { msg: Msg }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", position: "relative" }}>
      <div className={isUser ? "bubble-user" : "bubble-ai"} style={{
        maxWidth: "76%", padding: "10px 14px", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-wrap", position: "relative"
      }}>
        {msg.content}
        {!isUser && (
          <button 
            onClick={handleCopy}
            title="Copiar texto"
            style={{
              position: "absolute",
              bottom: "4px",
              right: "-32px",
              background: "transparent",
              border: "none",
              color: copied ? "var(--primary)" : "var(--text-dim)",
              cursor: "pointer",
              fontSize: "1rem"
            }}
          >
            {copied ? "✓" : "📋"}
          </button>
        )}
      </div>
    </div>
  );
}
