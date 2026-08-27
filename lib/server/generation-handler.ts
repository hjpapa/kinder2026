import { NextResponse, type NextRequest } from "next/server";
import type { ZodType } from "zod";
import { isDemoFallbackEnabled, isDemoMode } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/server/rate-limit";

type HandlerOptions<TInput, TResult> = {
  kind: string;
  schema: ZodType<TInput>;
  maxBytes: number;
  demoResult: TResult;
  generate: (input: TInput, signal: AbortSignal) => Promise<TResult>;
};

export async function handleGeneration<TInput, TResult>(request: NextRequest, options: HandlerOptions<TInput, TResult>) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "JSON 형식으로 요청해 주세요.", code: "INVALID_CONTENT_TYPE" }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > options.maxBytes) {
    return NextResponse.json({ error: "입력 내용이 너무 깁니다.", code: "INPUT_TOO_LONG" }, { status: 413 });
  }

  const limit = checkRateLimit(request, options.kind);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 빠르게 반복되었습니다. 잠시 후 다시 시도해 주세요.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > options.maxBytes) {
      return NextResponse.json({ error: "입력 내용이 너무 깁니다.", code: "INPUT_TOO_LONG" }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "요청 내용을 읽지 못했습니다.", code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = options.schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "필수 입력과 입력 길이를 확인해 주세요.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json({ data: options.demoResult, mode: "demo" });
  }

  try {
    const data = await options.generate(parsed.data, request.signal);
    return NextResponse.json({ data, mode: "live" });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 500;
    const code = error instanceof Error ? error.message : "GENERATION_FAILED";
    const message = code === "OPENAI_API_KEY_MISSING"
      ? "서버의 AI 설정을 확인해 주세요."
      : status === 429
        ? "AI 사용량이 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요."
        : "초안을 만들지 못했습니다. 입력 내용은 유지되어 있습니다.";
    return NextResponse.json(
      { error: message, code: status === 429 ? "OPENAI_RATE_LIMIT" : "GENERATION_FAILED", fallbackAvailable: isDemoFallbackEnabled() },
      { status: status === 429 ? 429 : 502 },
    );
  }
}
