import React from "react";
import { Msg } from "@/types";

export function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div className={isUser ? "bubble-user" : "bubble-ai"} style={{
        maxWidth: "76%", padding: "10px 14px", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-wrap",
      }}>
        {msg.content}
      </div>
    </div>
  );
}
