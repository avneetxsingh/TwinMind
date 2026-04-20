import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";

interface SuggestionsRequestBody {
  full_transcript: string;
  recent_transcript: string;
  last_suggestions: string;
  system_prompt: string;
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-groq-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing x-groq-key header" }, { status: 401 });
  }

  let body: SuggestionsRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { full_transcript, recent_transcript, last_suggestions, system_prompt } = body;
  if (
    typeof full_transcript !== "string" ||
    typeof recent_transcript !== "string" ||
    typeof last_suggestions !== "string" ||
    typeof system_prompt !== "string"
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const userContent = [
    `FULL CONVERSATION TRANSCRIPT:\n${full_transcript}`,
    `LAST 45 SECONDS:\n${recent_transcript}`,
    `SUGGESTIONS ALREADY SHOWN (do not repeat these):\n${last_suggestions}`,
  ].join("\n\n");

  try {
    const groq = getGroqClient(apiKey);
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Suggestions generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
