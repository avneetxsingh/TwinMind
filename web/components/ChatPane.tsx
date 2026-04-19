"use client";

import { useState, useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
}

export default function ChatPane({ messages, isLoading, onSend }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput("");
  }

  return (
    <div className="pane">
      <div className="pane-header">
        <h2 className="pane-title">Chat</h2>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="empty-state">Click a suggestion or ask a question.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="bubble">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="bubble muted">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          placeholder="Ask anything about this conversation…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
        />
        <button className="send-btn" onClick={handleSend} disabled={!input.trim() || isLoading}>
          Send
        </button>
      </div>
    </div>
  );
}
