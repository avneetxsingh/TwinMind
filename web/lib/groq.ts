import Groq from "groq-sdk";

export function getGroqClient(apiKey: string): Groq {
  return new Groq({ apiKey });
}
