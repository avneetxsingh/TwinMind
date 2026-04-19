"use client";

import { useState, useCallback } from "react";
import TranscriptPane from "@/components/TranscriptPane";
import SuggestionsPane from "@/components/SuggestionsPane";
import ChatPane from "@/components/ChatPane";
import type { TranscriptChunk, SuggestionBatch, Suggestion, ChatMessage } from "@/lib/types";
import "./page.css";

export default function Page() {
  const [isRecording, setIsRecording] = useState(false);
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [batches, setBatches] = useState<SuggestionBatch[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  function toggleRecording() {
    setIsRecording((prev) => !prev);
  }

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || chunks.length === 0) return;
    setIsRefreshing(true);
    try {
      // TODO: POST /api/suggestions with transcript
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, chunks]);

  function handleSuggestionClick(suggestion: Suggestion) {
    addMessage("user", suggestion.preview);
    sendToChat(suggestion.detail_prompt);
  }

  function handleChatSend(text: string) {
    addMessage("user", text);
    sendToChat(text);
  }

  function addMessage(role: ChatMessage["role"], content: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, content }]);
  }

  async function sendToChat(prompt: string) {
    setIsChatLoading(true);
    try {
      // TODO: POST /api/chat with prompt + full transcript context
      void prompt;
    } finally {
      setIsChatLoading(false);
    }
  }

  // These will be used once mic + API wiring is done
  void setChunks;
  void setBatches;

  return (
    <div className="layout">
      <TranscriptPane
        chunks={chunks}
        isRecording={isRecording}
        onToggleRecording={toggleRecording}
      />
      <SuggestionsPane
        batches={batches}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onSuggestionClick={handleSuggestionClick}
      />
      <ChatPane
        messages={messages}
        isLoading={isChatLoading}
        onSend={handleChatSend}
      />
    </div>
  );
}
