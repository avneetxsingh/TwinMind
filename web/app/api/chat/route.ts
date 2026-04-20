import { NextRequest } from "next/server";
import { getGroqClient } from "@/lib/groq";

interface ChatRequestBody {
  prompt: string;
  full_transcript: string;
  system_prompt: string;
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-groq-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing x-groq-key header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { prompt, full_transcript, system_prompt } = body;
  if (
    typeof prompt !== "string" ||
    typeof full_transcript !== "string" ||
    typeof system_prompt !== "string"
  ) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userContent = `TRANSCRIPT CONTEXT:\n${full_transcript}\n\nUSER QUESTION:\n${prompt}`;

  try {
    const groq = getGroqClient(apiKey);
    const stream = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: userContent },
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat generation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
