import { NextResponse, type NextRequest } from "next/server";
import { getImageModel, getOpenAIClient, isDemoFallbackEnabled, isDemoMode } from "@/lib/ai/client";
import { playSupportImageInputSchema } from "@/lib/schemas";
import { checkRateLimit } from "@/lib/server/rate-limit";

const piiPattern = /(?:\b(?:01[016789]|0\d{1,2})[- ]?\d{3,4}[- ]?\d{4}\b)|(?:[\w.+-]+@[\w-]+\.[\w.-]+)|(?:\b\d{6}[- ]?[1-4]\d{6}\b)|(?:(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\n,]{0,30}(?:로|길|동)\s?\d{1,4}(?:-\d{1,4})?)/i;
const MAX_INPUT_BYTES = 10_000;

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "JSON 형식으로 요청해 주세요." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: "이미지 설명이 너무 깁니다." }, { status: 413 });
  }
  const limit = checkRateLimit(request, "play-support-image");
  if (!limit.allowed) return NextResponse.json({ error: "요청이 너무 빠르게 반복되었습니다." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_INPUT_BYTES) return NextResponse.json({ error: "이미지 설명이 너무 깁니다." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "요청 내용을 읽지 못했습니다." }, { status: 400 });
  }

  const parsed = playSupportImageInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "이미지 설명을 확인해 주세요." }, { status: 400 });
  if (piiPattern.test(`${parsed.data.playName}\n${parsed.data.prompt}`)) return NextResponse.json({ error: "연락처·주소·개인식별정보를 제거한 뒤 다시 시도해 주세요." }, { status: 400 });
  if (isDemoMode()) return NextResponse.json({ data: null, mode: "demo", demoCanvas: true });

  try {
    const response = await getOpenAIClient().images.generate({
      model: getImageModel(),
      prompt: `유치원 놀이 지원자료용 그림. 유아 사진이나 특정 인물 없이, 교사가 놀이 환경 구성에 참고할 수 있는 따뜻하고 전문적인 교육 자료 이미지. 놀이: ${parsed.data.playName}. 연령: ${parsed.data.age}. 요청: ${parsed.data.prompt}. 텍스트, 실명, 로고, 워터마크 없음.`,
      size: "1536x1024",
      quality: "medium",
      output_format: "jpeg",
      output_compression: 72,
      n: 1,
    }, { signal: request.signal });
    const image = response.data?.[0]?.b64_json;
    if (!image) throw new Error("IMAGE_EMPTY");
    return NextResponse.json({ data: `data:image/jpeg;base64,${image}`, mode: "live" });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 500;
    const missingKey = error instanceof Error && error.message === "OPENAI_API_KEY_MISSING";
    return NextResponse.json(
      { error: missingKey ? "서버의 이미지 AI 설정을 확인해 주세요." : status === 429 ? "이미지 AI 사용량이 잠시 제한되었습니다." : "이미지를 만들지 못했습니다.", fallbackAvailable: isDemoFallbackEnabled() },
      { status: status === 429 ? 429 : 502, headers: status === 429 ? { "Retry-After": "60" } : undefined },
    );
  }
}
