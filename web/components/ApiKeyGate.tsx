"use client";

import { useState, useEffect, FormEvent } from "react";

interface Props {
  children: (apiKey: string, onReset: () => void) => React.ReactNode;
}

const STORAGE_KEY = "groq_api_key";

export default function ApiKeyGate({ children }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setApiKey(stored);
    setReady(true);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed.startsWith("gsk_")) {
      setError("Key should start with gsk_");
      return;
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    setApiKey(trimmed);
    setError("");
  }

  function handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
    setInput("");
  }

  if (!ready) return null;

  if (!apiKey) {
    return (
      <div className="key-gate">
        <div className="key-gate-card">
          <h1 className="key-gate-title">TwinMind Copilot</h1>
          <p className="key-gate-subtitle">
            Enter your Groq API key to get started. It stays in your browser only.
          </p>
          <form onSubmit={handleSubmit} className="key-gate-form">
            <input
              className="key-gate-input"
              type="password"
              placeholder="gsk_..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              spellCheck={false}
            />
            {error && <p className="key-gate-error">{error}</p>}
            <button className="key-gate-btn" type="submit">
              Continue
            </button>
          </form>
          <p className="key-gate-hint">
            Get a free key at{" "}
            <a href="https://console.groq.com" target="_blank" rel="noreferrer">
              console.groq.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <>{children(apiKey, handleReset)}</>;
}
