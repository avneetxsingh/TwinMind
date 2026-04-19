# TwinMind Copilot

A real-time AI meeting assistant. Three-pane layout: live transcript on the left, context-aware suggestions in the middle, and a chat window on the right.

## How it works

- **Transcript** — microphone input is transcribed in ~30-second chunks via Groq's Whisper API
- **Suggestions** — every 30 seconds (or on demand), the current transcript is sent to Groq and returns exactly 3 suggestions tailored to the conversation's current moment and phase. Suggestions can be a question to ask, a talking point, an answer, a fact-check, a clarification, or an action item — the model picks the right mix.
- **Chat** — clicking a suggestion sends its full detail prompt to the chat. Users can also type freely. The full transcript is included as context.

## Stack

- **Next.js 15** (App Router) — API routes keep the Groq key server-side
- **TypeScript**
- **Groq API** — `whisper-large-v3` for transcription, `llama-3.3-70b-versatile` for suggestions + chat

## Getting started

```bash
cd web
cp .env.example .env.local   # add your GROQ_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
web/
├── app/
│   ├── api/
│   │   ├── transcribe/route.ts   # POST — audio → text (Whisper)
│   │   ├── suggestions/route.ts  # POST — transcript → 3 suggestions
│   │   └── chat/route.ts         # POST — prompt + transcript → answer
│   ├── page.tsx                  # root page + shared state
│   ├── page.css                  # all component styles
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── TranscriptPane.tsx
│   ├── SuggestionsPane.tsx
│   └── ChatPane.tsx
└── lib/
    └── types.ts                  # shared TypeScript types
```

## Prompt design

Suggestions use a routing architecture: the prompt first detects the conversation phase (opening / middle / closing) and moment type (claim / question / confusion / decision / general), then applies strict selection rules to produce the right mix of suggestion types. See `docs/Prompts/` for prompt versions.
