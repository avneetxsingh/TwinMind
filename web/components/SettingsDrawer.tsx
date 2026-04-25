"use client";

import { SUGGESTIONS_PROMPT, CHAT_SYSTEM_PROMPT } from "@/lib/prompts";

export interface Settings {
  suggestionsPrompt: string;
  chatSystemPrompt: string;
  recentChunks: number;
  chatChunks: number;
}

export const DEFAULT_SETTINGS: Settings = {
  suggestionsPrompt: SUGGESTIONS_PROMPT,
  chatSystemPrompt: CHAT_SYSTEM_PROMPT,
  recentChunks: 2,
  chatChunks: 0,
};

interface Props {
  settings: Settings;
  onUpdate: (s: Settings) => void;
  onClose: () => void;
  onResetApiKey: () => void;
}

export default function SettingsDrawer({ settings, onUpdate, onClose, onResetApiKey }: Props) {
  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    onUpdate({ ...settings, [key]: value });
  }

  return (
    <div className="settings-drawer">
      <div className="settings-drawer-header">
        <span className="settings-drawer-title">Settings</span>
        <button className="settings-drawer-close" onClick={onClose}>✕</button>
      </div>

      <div className="settings-drawer-body">
        <div className="settings-field">
          <label className="settings-label">Live Suggestions Prompt</label>
          <p className="settings-hint">Sent as system prompt to generate the 3 suggestion cards.</p>
          <textarea
            className="settings-textarea"
            value={settings.suggestionsPrompt}
            onChange={(e) => set("suggestionsPrompt", e.target.value)}
            rows={12}
            spellCheck={false}
          />
        </div>

        <div className="settings-field">
          <label className="settings-label">Chat System Prompt</label>
          <p className="settings-hint">Sent with every chat message and suggestion click for detailed answers.</p>
          <textarea
            className="settings-textarea"
            value={settings.chatSystemPrompt}
            onChange={(e) => set("chatSystemPrompt", e.target.value)}
            rows={6}
            spellCheck={false}
          />
        </div>

        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">Recent context window (chunks)</label>
            <p className="settings-hint">Chunks counted as "recent" for suggestions. 1 chunk ≈ 30s.</p>
            <input
              className="settings-number"
              type="number"
              min={1}
              max={20}
              value={settings.recentChunks}
              onChange={(e) => set("recentChunks", Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">Chat context window (0 = full transcript)</label>
            <p className="settings-hint">Chunks sent with chat/click answers. 0 sends the full transcript.</p>
            <input
              className="settings-number"
              type="number"
              min={0}
              max={50}
              value={settings.chatChunks}
              onChange={(e) => set("chatChunks", Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
        </div>

        <div className="settings-actions">
          <button className="settings-reset-btn" onClick={() => onUpdate(DEFAULT_SETTINGS)}>
            Reset to defaults
          </button>
          <button className="settings-api-btn" onClick={onResetApiKey}>
            Reset Groq API Key
          </button>
        </div>
      </div>
    </div>
  );
}
