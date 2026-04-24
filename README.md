# TwinMind Live Suggestions — Engineering Challenge

A real-time meeting copilot that listens to your conversation and surfaces exactly 3 contextually-appropriate suggestions per batch. Built as a TwinMind engineering challenge submission.

> *"What if your meeting assistant actually paid attention to the meeting?"*

---

## What It Does

The app runs as a three-column interface in your browser:

| Column | What it does |
|--------|-------------|
| **Mic & Transcript** | Captures your microphone in 30-second segments, transcribes each one via Groq Whisper, and appends it to a live scrolling transcript |
| **Live Suggestions** | After each new transcript chunk, runs the routing prompt and surfaces 3 fresh suggestions — fact-checks, clarifications, talking points, answers, questions, or action items depending on what's actually happening |
| **Chat** | Click any suggestion for a deep-dive answer with full transcript context, or type your own question. Streams the response in real time |

---

## The Core Idea: Routing Prompt Architecture

TwinMind's default behavior suggests questions. Just questions. Every batch, regardless of what's happening in the conversation.

After two live research sessions deliberately triggering different conversation moments, five specific weaknesses were identified and used to design a better system:

```
MAIN PROMPT (the router)
├── Detects meeting PHASE: OPENING → MIDDLE → CLOSING
├── Detects moment TYPE: CLAIM | QUESTION | CONFUSION | DECISION | GENERAL
└── Routes suggestion selection based on both signals
```

This means the app never falls back to generic questions. When someone makes a bold claim, it surfaces a fact-check. When confusion is expressed, it clarifies. When the meeting is wrapping up, it locks in action items. **The suggestions match what's actually happening.**

### The 6 Suggestion Types

| Type | When it fires |
|------|--------------|
| `FACT_CHECK` | A specific claim or statistic was just made |
| `ANSWER` | A question was asked and hasn't been answered yet |
| `CLARIFICATION` | Confusion or misalignment was expressed |
| `TALKING_POINT` | Decision being made, or mid-meeting context |
| `QUESTION` | Max 1 per batch — prioritized in opening phase |
| `ACTION_ITEM` | Closing phase only — always included when detected |

**Hard constraints:** Never 3 of the same type. Max 1 `QUESTION` per batch. Always mix ≥2 types. Previews must deliver the actual insight in under 40 words — not a pointer to it.

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Transcription:** Groq Whisper (`whisper-large-v3`) via API route
- **Suggestions & Chat:** Groq chat completions, streaming via `ReadableStream`
- **Auth:** Your Groq API key, stored in `localStorage`. Never touches a server beyond forwarding to Groq.
- **Persistence:** None. Session lives in memory. Export when done.

---

## Getting Started

**Prerequisites:** Node.js 18+, a [Groq API key](https://console.groq.com) (free tier works fine)

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste your Groq key (`gsk_...`) when prompted, and hit the mic button.

The key is stored in `localStorage` — you won't have to paste it every time. To reset it, click **⚙ Groq API Key** in the header.

No `.env` file needed. No backend setup. No database. Just the key and a conversation.

---

## Project Structure

```
web/
├── app/
│   ├── api/
│   │   ├── transcribe/route.ts   # Groq Whisper endpoint
│   │   ├── suggestions/route.ts  # Suggestion generation (JSON mode)
│   │   └── chat/route.ts         # Streaming chat completions
│   ├── page.tsx                  # Root — all state lives here
│   └── page.css                  # All styles (single file, intentional)
├── components/
│   ├── ApiKeyGate.tsx            # Key entry + localStorage persistence
│   ├── TranscriptPane.tsx        # Left column
│   ├── SuggestionsPane.tsx       # Middle column
│   └── ChatPane.tsx              # Right column
└── lib/
    ├── groq.ts                   # Groq client factory
    ├── prompts.ts                # SUGGESTIONS_PROMPT (v3) + CHAT_SYSTEM_PROMPT
    └── types.ts                  # Shared TypeScript types

docs/
├── Prompts/
│   ├── v1.md                     # Baseline prompt
│   ├── v2.md                     # + deduplication via last_suggestions
│   └── v3.md                     # + ACTION_ITEM, 40-word cap, stricter rules
└── daily/
    └── Day1.md                   # Research sessions, TwinMind weaknesses, architecture decision
```

---

## How the Suggestion Pipeline Works

Every ~30 seconds (or when you click Reload), the app sends three things to `/api/suggestions`:

- **`full_transcript`** — the entire conversation so far, timestamped
- **`recent_transcript`** — the last 2 chunks (~60s), for recency weighting
- **`last_suggestions`** — what was just shown, so the model doesn't repeat itself

The prompt runs in JSON mode and returns `detected_part`, `detected_moment`, and `suggestions[]`. The frontend validates the shape and prepends the new batch to the top of the middle column.

When a suggestion is clicked, its `detail_prompt` (generated alongside the preview) goes to `/api/chat` with the full transcript as context — a separate, longer-form streaming response.

---

## Prompt Versions

Three iterations live in `docs/Prompts/`:

- **v1** — Baseline. Works, but no deduplication and no action items.
- **v2** — Added `{last_suggestions}` to stop the model from recycling the same three suggestions every 30 seconds. (It was doing that. Enthusiastically.)
- **v3** — Current. Added `ACTION_ITEM` for closing phase, enforced 40-word preview cap, tightened fact-check to only fire on claims actually in the transcript. Never invents statistics. Never hallucinates local support organizations. Mostly behaves.

---

## Export

Hit **↓ Export session** in the header at any point. Downloads a timestamped JSON file with the full transcript, every suggestion batch, and the complete chat history.

```json
{
  "exportedAt": "2026-04-21T...",
  "transcript": [{ "timestamp": "0:30", "text": "..." }],
  "suggestions": [{ "timestamp": "0:30", "suggestions": [...] }],
  "chat": [{ "role": "user", "content": "..." }, ...]
}
```

---

## Design Decisions Worth Noting

**Why one API call instead of two?** Routing and suggestion selection happen in the same prompt. A second call would add latency and complexity for marginal gains. The model handles both in one shot cleanly.

**Why 30-second segments?** It's the sweet spot between latency and transcription accuracy. Very short silences produce empty chunks, which are dropped. Very long segments delay the feedback loop.

**Why no backend, no database?** None of it is needed. The Groq key lives in the browser. The session lives in memory. The export button is the persistence layer. Keeping the stack minimal means the prompt engineering stays the focus — which is the point.

---

## Commands

All from `web/`:

```bash
npm run dev      # Dev server → localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

---

*Built for the TwinMind engineering challenge. The app listens so you don't have to.*
