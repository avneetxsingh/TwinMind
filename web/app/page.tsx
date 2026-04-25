"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import TranscriptPane from "@/components/TranscriptPane";
import SuggestionsPane from "@/components/SuggestionsPane";
import ChatPane from "@/components/ChatPane";
import ApiKeyGate from "@/components/ApiKeyGate";
import SettingsDrawer, { DEFAULT_SETTINGS, type Settings } from "@/components/SettingsDrawer";
import type { TranscriptChunk, SuggestionBatch, Suggestion, ChatMessage } from "@/lib/types";
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
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

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

    setRecordingError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow mic access and try again."
          : err instanceof DOMException && err.name === "NotFoundError"
          ? "No microphone found. Please connect one and try again."
          : "Could not access microphone. Please check your browser settings.";
      setRecordingError(msg);
      return;
    }

    streamRef.current = stream;
    startTimeRef.current = Date.now();
    isRecordingRef.current = true;

    timerIntervalRef.current = setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    function runSegment() {
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        isRecordingRef.current = false;
        clearInterval(timerIntervalRef.current!);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setRecordingTime(0);
        setRecordingError("Your browser does not support audio recording. Try Chrome or Firefox.");
        return;
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (!e.data.size) return;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = String(elapsed % 60).padStart(2, "0");

        const formData = new FormData();
        formData.append("audio", e.data, "chunk.webm");

        try {
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "x-groq-key": apiKey },
            body: formData,
          });
          if (!res.ok) return;
          const data = await res.json();
          const text: string = data.text ?? "";
          if (!text.trim()) return;

          setChunks((prev) => [
            ...prev,
            { id: crypto.randomUUID(), timestamp: `${mins}:${secs}`, text: text.trim() },
          ]);
        } catch {
          // Network error or JSON parse failure — skip this chunk silently
        }
      };

      recorder.onstop = () => {
        if (isRecordingRef.current) runSegment();
      };

      recorder.onerror = () => {
        isRecordingRef.current = false;
        clearInterval(timerIntervalRef.current!);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setRecordingTime(0);
        setRecordingError("Recording stopped unexpectedly. Please try again.");
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
      const recent_transcript = chunks
        .slice(-settings.recentChunks)
        .map((c) => `[${c.timestamp}] ${c.text}`)
        .join("\n");
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
          system_prompt: settings.suggestionsPrompt,
        }),
      });

      if (!res.ok) return;

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        return;
      }

      if (!Array.isArray(data.suggestions)) return;

      const mins = Math.floor(recordingTime / 60);
      const secs = String(recordingTime % 60).padStart(2, "0");

      setBatches((prev) => [
        { id: crypto.randomUUID(), timestamp: `${mins}:${secs}`, suggestions: data.suggestions as SuggestionBatch["suggestions"] },
        ...prev,
      ]);
    } catch {
      // Network error — fail silently, will retry on next chunk
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, chunks, batches, apiKey, recordingTime, settings.recentChunks, settings.suggestionsPrompt]);

  const handleRefreshRef = useRef(handleRefresh);
  useEffect(() => { handleRefreshRef.current = handleRefresh; }, [handleRefresh]);

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

  function handleExport() {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        transcript: chunks.map((c) => ({ timestamp: c.timestamp, text: c.text })),
        suggestions: batches.map((b) => ({
          timestamp: b.timestamp,
          suggestions: b.suggestions.map((s) => ({
            type: s.type,
            preview: s.preview,
            detail_prompt: s.detail_prompt,
          })),
        })),
        chat: messages.map((m) => ({ role: m.role, content: m.content })),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `twinmind-session-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    }
  }

  async function sendToChat(prompt: string) {
    setIsChatLoading(true);
    const contextChunks = settings.chatChunks === 0 ? chunks : chunks.slice(-settings.chatChunks);
    const fullTranscript = contextChunks.map((c) => `[${c.timestamp}] ${c.text}`).join("\n");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-groq-key": apiKey,
        },
        body: JSON.stringify({
          prompt,
          full_transcript: fullTranscript,
          system_prompt: settings.chatSystemPrompt,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Chat request failed");

      setIsChatLoading(false);
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
        );
      }
    } catch (err) {
      console.error(err);
      setIsChatLoading(false);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Failed to get a response. Please try again." },
      ]);
    }
  }

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <span className="app-header-title">TwinMind — Live Suggestions Web App</span>
        <div className="app-header-center">
          <button className="export-btn" onClick={handleExport}>↓ Export session</button>
          <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙ Settings</button>
        </div>
        <span className="app-header-nav">3-column layout · Transcript · Live Suggestions · Chat</span>
      </header>

      <div className="layout">
        <TranscriptPane
          chunks={chunks}
          isRecording={isRecording}
          recordingTime={recordingTime}
          onToggleRecording={toggleRecording}
          error={recordingError}
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

      {showSettings && (
        <SettingsDrawer
          settings={settings}
          onUpdate={setSettings}
          onClose={() => setShowSettings(false)}
          onResetApiKey={() => { setShowSettings(false); onReset(); }}
        />
      )}
    </div>
  );
}
