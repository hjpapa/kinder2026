"use client";

export type GenerationMode = "live" | "demo";

export async function postGeneration<TResult>(url: string, body: unknown, signal?: AbortSignal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const raw = await response.text();
  let payload: { data?: TResult; mode?: GenerationMode; error?: string; code?: string; fallbackAvailable?: boolean; demoCanvas?: boolean } = {};
  try { payload = raw ? JSON.parse(raw) as typeof payload : {}; } catch { /* Platform and firewall errors can return HTML. */ }
  if (!response.ok || !payload.data) {
    const defaultMessage = response.status === 429 ? "요청이 많습니다. 잠시 후 다시 시도해 주세요." : "초안을 만들지 못했습니다.";
    const error = new Error(payload.error || defaultMessage) as Error & { fallbackAvailable?: boolean; demoCanvas?: boolean; status?: number; code?: string; retryAfter?: number };
    error.fallbackAvailable = payload.fallbackAvailable;
    error.demoCanvas = payload.demoCanvas;
    error.status = response.status;
    error.code = payload.code;
    error.retryAfter = Number(response.headers.get("retry-after") || 0) || undefined;
    throw error;
  }
  return { data: payload.data, mode: payload.mode || "live" };
}
