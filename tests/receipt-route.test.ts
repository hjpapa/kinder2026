import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReceiptExtractionResult } from "@/lib/schemas";

const aiMocks = vi.hoisted(() => ({
  extractReceipts: vi.fn(),
  isDemoFallbackEnabled: vi.fn(() => false),
  isDemoMode: vi.fn(() => false),
}));
const rateLimitMocks = vi.hoisted(() => ({ checkRateLimit: vi.fn(() => ({ allowed: true, retryAfter: 0 })) }));

vi.mock("@/lib/ai/generate", () => ({ extractReceipts: aiMocks.extractReceipts }));
vi.mock("@/lib/ai/client", () => ({ isDemoFallbackEnabled: aiMocks.isDemoFallbackEnabled, isDemoMode: aiMocks.isDemoMode }));
vi.mock("@/lib/server/rate-limit", () => ({ checkRateLimit: rateLimitMocks.checkRateLimit }));

import { POST } from "@/app/api/extract/receipts/route";

const result: ReceiptExtractionResult = {
  receipts: [{ sourceIndex: 1, merchant: "누리문구", purchaseDate: "2026-09-10", items: [{ description: "색지", quantity: 2, unitPrice: 3_000, printedAmount: 6_000, confidence: "high", needsReview: false }], printedTotal: 6_000, warnings: [] }],
  reviewFlags: [],
};

function jpeg(size = 32, type = "image/jpeg") {
  const bytes = new Uint8Array(Math.max(size, 3));
  bytes.set([0xff, 0xd8, 0xff]);
  return new File([bytes], "private-original-name.jpg", { type });
}

function request(options?: { context?: unknown; files?: File[]; headers?: Record<string, string> }) {
  const data = new FormData();
  data.append("context", JSON.stringify(options?.context ?? { subject: "미술재료 정산", purpose: "교실 활동", budgetCategory: "", notes: "", privacyConfirmed: true }));
  (options?.files ?? [jpeg()]).forEach((file) => data.append("receipts", file));
  const nextRequest = new NextRequest("http://localhost/api/extract/receipts", {
    method: "POST",
    body: "multipart-test-body",
    headers: { "content-type": "multipart/form-data; boundary=vitest", ...options?.headers },
  });
  vi.spyOn(nextRequest, "formData").mockResolvedValue(data);
  return nextRequest;
}

describe("영수증 추출 라우트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiMocks.extractReceipts.mockResolvedValue(result);
    aiMocks.isDemoFallbackEnabled.mockReturnValue(false);
    aiMocks.isDemoMode.mockReturnValue(false);
    rateLimitMocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfter: 0 });
  });

  it("multipart가 아닌 요청을 AI 호출 전에 거부한다", async () => {
    const response = await POST(new NextRequest("http://localhost/api/extract/receipts", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
    expect(response.status).toBe(415);
    expect(aiMocks.extractReceipts).not.toHaveBeenCalled();
  });

  it("Vercel 안전 상한을 넘는 Content-Length를 413으로 거부한다", async () => {
    const response = await POST(request({ headers: { "content-length": "4000001" } }));
    expect(response.status).toBe(413);
    expect(aiMocks.extractReceipts).not.toHaveBeenCalled();
  });

  it("명시적 개인정보 전송 동의가 없으면 거부한다", async () => {
    const response = await POST(request({ context: { subject: "미술재료 정산", purpose: "", budgetCategory: "", notes: "", privacyConfirmed: false } }));
    expect(response.status).toBe(400);
    expect(aiMocks.extractReceipts).not.toHaveBeenCalled();
  });

  it("파일 MIME과 실제 시그니처가 다르면 거부한다", async () => {
    const response = await POST(request({ files: [new File([new Uint8Array([1, 2, 3, 4])], "fake.jpg", { type: "image/jpeg" })] }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_IMAGE" });
    expect(aiMocks.extractReceipts).not.toHaveBeenCalled();
  });

  it("5장을 넘거나 장당 700KB를 넘는 파일을 거부한다", async () => {
    const tooMany = await POST(request({ files: Array.from({ length: 6 }, () => jpeg()) }));
    expect(tooMany.status).toBe(400);
    const tooLarge = await POST(request({ files: [jpeg(700_001)] }));
    expect(tooLarge.status).toBe(413);
    expect(aiMocks.extractReceipts).not.toHaveBeenCalled();
  });

  it("rate limit의 Retry-After를 보존하고 이미지 바이트를 읽지 않는다", async () => {
    rateLimitMocks.checkRateLimit.mockReturnValueOnce({ allowed: false, retryAfter: 29 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("29");
    expect(aiMocks.extractReceipts).not.toHaveBeenCalled();
  });

  it("검증한 이미지 데이터만 추출 함수로 보내고 응답에는 base64를 포함하지 않는다", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain("/9j/");
    expect(JSON.parse(body)).toEqual({ data: result, mode: "live" });
    expect(aiMocks.extractReceipts).toHaveBeenCalledWith(
      { subject: "미술재료 정산", purpose: "교실 활동", budgetCategory: "", notes: "", privacyConfirmed: true },
      [{ mimeType: "image/jpeg", base64: expect.any(String) }],
      expect.any(AbortSignal),
    );
  });

  it("데모 모드에서는 영수증 바이트를 OpenAI로 보내지 않는다", async () => {
    aiMocks.isDemoMode.mockReturnValueOnce(true);
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ mode: "demo" });
    expect(aiMocks.extractReceipts).not.toHaveBeenCalled();
  });

  it("OpenAI 429를 안전한 오류와 Retry-After로 바꾼다", async () => {
    aiMocks.extractReceipts.mockRejectedValueOnce(Object.assign(new Error("rate"), { status: 429 }));
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    await expect(response.json()).resolves.toMatchObject({ code: "OPENAI_RATE_LIMIT" });
  });
});
