"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import TranscriptPane from "@/components/TranscriptPane";
import SuggestionsPane from "@/components/SuggestionsPane";
import ChatPane from "@/components/ChatPane";
import ApiKeyGate from "@/components/ApiKeyGate";
import type { TranscriptChunk, SuggestionBatch, Suggestion, ChatMessage } from "@/lib/types";
import { SUGGESTIONS_PROMPT } from "@/lib/prompts";
import "./page.css";

export default function Page() {
  return (
    <ApiKeyGate>
      {(apiKey, onReset) => <App apiKey={apiKey} onReset={onReset} />}
    </ApiKeyGate>
  );
}

function App({ apiKey, onReset }: { apiKey: string; onReset: () => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [batches, setBatches] = useState<SuggestionBatch[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function toggleRecording() {
    if (isRecording) {
      isRecordingRef.current = false;
      clearInterval(timerIntervalRef.current!);
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      setRecordingTime(0);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    startTimeRef.current = Date.now();
    isRecordingRef.current = true;

    timerIntervalRef.current = setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    function runSegment() {
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (!e.data.size) return;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = String(elapsed % 60).padStart(2, "0");

        const formData = new FormData();
        formData.append("audio", e.data, "chunk.webm");

        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "x-groq-key": apiKey },
          body: formData,
        });
        if (!res.ok) return;
        const { text } = await res.json();
        if (!text?.trim()) return;

        setChunks((prev) => [
          ...prev,
          { id: crypto.randomUUID(), timestamp: `${mins}:${secs}`, text: text.trim() },
        ]);
      };

      recorder.onstop = () => {
        if (isRecordingRef.current) runSegment();
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 30000);
    }

    runSegment();
    setIsRecording(true);
  }

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || chunks.length === 0) return;
    setIsRefreshing(true);
    try {
      const full_transcript = chunks.map((c) => `[${c.timestamp}] ${c.text}`).join("\n");
      const recent_transcript = chunks.slice(-2).map((c) => `[${c.timestamp}] ${c.text}`).join("\n");
      const lastBatch = batches[0];
      const last_suggestions = lastBatch
        ? lastBatch.suggestions.map((s) => `[${s.type}] ${s.preview}`).join("\n")
        : "None";

      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-groq-key": apiKey },
        body: JSON.stringify({
          full_transcript,
          recent_transcript,
          last_suggestions,
          system_prompt: SUGGESTIONS_PROMPT,
        }),
      });

      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.suggestions)) return;

      const mins = Math.floor(recordingTime / 60);
      const secs = String(recordingTime % 60).padStart(2, "0");

      setBatches((prev) => [
        { id: crypto.randomUUID(), timestamp: `${mins}:${secs}`, suggestions: data.suggestions },
        ...prev,
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, chunks, batches, apiKey, recordingTime]);

  // Keep a ref so the auto-refresh interval always calls the latest handleRefresh
  const handleRefreshRef = useRef(handleRefresh);
  useEffect(() => { handleRefreshRef.current = handleRefresh; }, [handleRefresh]);

  // Auto-refresh suggestions every time a new transcript chunk arrives (~30s)
  useEffect(() => {
    if (!isRecording || chunks.length === 0) return;
    handleRefreshRef.current();
  }, [chunks.length]); // eslint-disable-line react-hooks/exhaustive-deps

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


  return (
    <div className="layout">
      <button className="settings-btn" onClick={onReset} title="Change API key">
        ⚙
      </button>
      <TranscriptPane
        chunks={chunks}
        isRecording={isRecording}
        recordingTime={recordingTime}
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
