import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-groq-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing x-groq-key header" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "Missing or invalid audio field" }, { status: 400 });
  }

  try {
    const groq = getGroqClient(apiKey);
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3",
    });
    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
