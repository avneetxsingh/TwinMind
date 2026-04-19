"use client";

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
  return (
    <div className="pane border-x">
      <div className="pane-header">
        <h2 className="pane-title">Suggestions</h2>
        <button onClick={onRefresh} disabled={isRefreshing} className="refresh-btn">
          {isRefreshing ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      <div className="pane-body">
        {batches.length === 0 ? (
          <p className="empty-state">Suggestions will appear once the transcript starts.</p>
        ) : (
          batches.map((batch, i) => (
            <div key={batch.id} className="batch">
              <p className="batch-label">{i === 0 ? `Latest · ${batch.timestamp}` : batch.timestamp}</p>
              {batch.suggestions.map((s, j) => (
                <button key={j} className="suggestion-card" onClick={() => onSuggestionClick(s)}>
                  <span className="suggestion-type">{TYPE_LABEL[s.type]}</span>
                  <p className="suggestion-preview">{s.preview}</p>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
