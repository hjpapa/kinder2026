import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const aiMocks = vi.hoisted(() => ({
  generate: vi.fn(),
  getOpenAIClient: vi.fn(),
  getImageModel: vi.fn(() => "test-image-model"),
  isDemoFallbackEnabled: vi.fn(() => true),
  isDemoMode: vi.fn(() => false),
}));
const rateLimitMocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfter: 0 })),
}));

vi.mock("@/lib/ai/client", () => ({
  getImageModel: aiMocks.getImageModel,
  getOpenAIClient: aiMocks.getOpenAIClient,
  isDemoFallbackEnabled: aiMocks.isDemoFallbackEnabled,
  isDemoMode: aiMocks.isDemoMode,
}));
vi.mock("@/lib/server/rate-limit", () => ({ checkRateLimit: rateLimitMocks.checkRateLimit }));

import { POST } from "@/app/api/generate/play-support-image/route";

function imageRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/generate/play-support-image", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = {
  playName: "가을 열매 가게 놀이",
  prompt: "자연물을 분류하고 진열할 수 있는 따뜻한 놀이 공간",
  age: "만 5세",
};

describe("놀이 지원 이미지 라우트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiMocks.getOpenAIClient.mockReturnValue({ images: { generate: aiMocks.generate } });
    aiMocks.generate.mockResolvedValue({ data: [{ b64_json: "dGVzdA==" }] });
    aiMocks.isDemoMode.mockReturnValue(false);
    aiMocks.isDemoFallbackEnabled.mockReturnValue(true);
    rateLimitMocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfter: 0 });
  });

  it.each([
    ["놀이명 속 전화번호", { ...validBody, playName: "010-1234-5678 가게 놀이" }],
    ["설명 속 이메일", { ...validBody, prompt: "teacher@example.com에게 보낼 놀이 공간 자료를 만들어 주세요" }],
    ["설명 속 주민등록번호 형태", { ...validBody, prompt: "990101-1234567 표기가 들어간 놀이 안내 자료를 만들어 주세요" }],
    ["설명 속 상세 주소", { ...validBody, prompt: "서울 강남구 테헤란로 123으로 배송할 놀이 자료를 만들어 주세요" }],
  ])("%s를 AI 호출 전에 차단한다", async (_label, body) => {
    const response = await POST(imageRequest(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "연락처·주소·개인식별정보를 제거한 뒤 다시 시도해 주세요.",
    });
    expect(aiMocks.getOpenAIClient).not.toHaveBeenCalled();
    expect(aiMocks.generate).not.toHaveBeenCalled();
  });

  it("전역 한도 초과 시 Retry-After를 그대로 응답한다", async () => {
    rateLimitMocks.checkRateLimit.mockReturnValueOnce({ allowed: false, retryAfter: 37 });

    const response = await POST(imageRequest(validBody));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("37");
    expect(aiMocks.getOpenAIClient).not.toHaveBeenCalled();
  });

  it("개인정보가 없는 요청만 모의 이미지 생성기로 전달한다", async () => {
    const response = await POST(imageRequest(validBody));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: "data:image/jpeg;base64,dGVzdA==",
      mode: "live",
    });
    expect(aiMocks.generate).toHaveBeenCalledTimes(1);
  });
});
