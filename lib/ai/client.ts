import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 120_000, maxRetries: 0 });
  return client;
}

export function getTextModel() {
  return process.env.OPENAI_MODEL || "gpt-5.6-terra";
}

export function getImageModel() {
  return process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export function isDemoFallbackEnabled() {
  return process.env.DEMO_FALLBACK === "true";
}
