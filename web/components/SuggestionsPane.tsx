"use client";

import { useState } from "react";
import type { Suggestion, SuggestionBatch } from "@/lib/types";

const TYPE_LABEL: Record<Suggestion["type"], string> = {
  FACT_CHECK: "Fact Check",
  TALKING_POINT: "Talking Point",
  ANSWER: "Answer",
  QUESTION: "Question",
  CLARIFICATION: "Clarification",
  ACTION_ITEM: "Action Item",
};

interface Props {
  batches: SuggestionBatch[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onSuggestionClick: (suggestion: Suggestion) => void;
}

export default function SuggestionsPane({ batches, isRefreshing, onRefresh, onSuggestionClick }: Props) {
  const [clicked, setClicked] = useState<Set<string>>(new Set());

  function handleClick(s: Suggestion, key: string) {
    if (clicked.has(key)) return; // prevent duplicate chat entries
    setClicked((prev) => new Set(prev).add(key));
    onSuggestionClick(s);
  }

  return (
    <div className="pane">
      <div className="pane-header">
        <h2 className="pane-title">2. Live Suggestions</h2>
        <span className="pane-badge">{batches.length} Batches</span>
      </div>

      <div className="pane-body">
        <div className="refresh-row">
          <button onClick={onRefresh} disabled={isRefreshing} className="refresh-btn">
            {isRefreshing ? "Refreshing…" : "↻ Reload suggestions"}
          </button>
          <span className="auto-refresh-hint">auto-refresh in 30s</span>
        </div>

        {batches.length === 0 ? (
          <>
            <div className="desc-card">
              On reload (or auto every ~30s), generate 3 fresh suggestions from recent transcript context.
              New batch appears at the top; older batches push down. Each is a tappable card —
              a question to ask, a talking point, an answer, or a fact-check.
              The preview alone should already be useful.
            </div>
            <p className="empty-state">Suggestions appear here once recording starts.</p>
          </>
        ) : (
          batches.map((batch, i) => (
            <div key={batch.id} className="batch">
              <p className="batch-label">{i === 0 ? `Latest · ${batch.timestamp}` : batch.timestamp}</p>
              {batch.suggestions.map((s, j) => {
                const key = `${batch.id}-${j}`;
                const isClicked = clicked.has(key);
                return (
                  <button
                    key={j}
                    className={`suggestion-card ${isClicked ? "clicked" : ""}`}
                    onClick={() => handleClick(s, key)}
                    title={isClicked ? "Already sent to chat" : undefined}
                  >
                    <span className="suggestion-type">
                      {TYPE_LABEL[s.type]}
                      {isClicked && <span className="suggestion-check"> ✓</span>}
                    </span>
                    <p className="suggestion-preview">{s.preview}</p>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
