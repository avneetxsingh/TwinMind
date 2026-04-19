"use client";

import { useEffect, useRef } from "react";
import type { TranscriptChunk } from "@/lib/types";

interface Props {
  chunks: TranscriptChunk[];
  isRecording: boolean;
  onToggleRecording: () => void;
}

export default function TranscriptPane({ chunks, isRecording, onToggleRecording }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunks]);

  return (
    <div className="pane">
      <PaneHeader title="Transcript">
        <button onClick={onToggleRecording} className={`mic-btn ${isRecording ? "active" : ""}`}>
          {isRecording && <span className="mic-dot" />}
          {isRecording ? "Stop" : "Start recording"}
        </button>
      </PaneHeader>

      <div className="pane-body">
        {chunks.length === 0 ? (
          <p className="empty-state">Press "Start recording" to begin.</p>
        ) : (
          chunks.map((chunk) => (
            <div key={chunk.id} className="transcript-chunk">
              <span className="chunk-timestamp">{chunk.timestamp}</span>
              <p className="chunk-text">{chunk.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function PaneHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="pane-header">
      <h2 className="pane-title">{title}</h2>
      {children}
    </div>
  );
}
