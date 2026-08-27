import { afterEach, describe, expect, it, vi } from "vitest";
import { postGeneration } from "@/lib/api-client";

function mockResponse(options: {
  status: number;
  body: string;
  headers?: Record<string, string>;
}) {
  return {
    ok: options.status >= 200 && options.status < 300,
    status: options.status,
    headers: new Headers(options.headers),
    text: vi.fn().mockResolvedValue(options.body),
  } as unknown as Response;
}

describe("postGeneration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("HTML 같은 비JSON 서버 오류를 안전한 일반 메시지로 바꾼다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({
      status: 502,
      body: "<html><body>Bad Gateway</body></html>",
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(postGeneration("/api/generate/observation", { memo: "관찰" })).rejects.toMatchObject({
      message: "초안을 만들지 못했습니다.",
      status: 502,
      fallbackAvailable: undefined,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/generate/observation", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo: "관찰" }),
    }));
  });

  it("비JSON 429 응답의 Retry-After를 오류 객체에 보존한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse({
      status: 429,
      body: "temporarily unavailable",
      headers: { "Retry-After": "37" },
    })));

    await expect(postGeneration("/api/generate/event-plan", {})).rejects.toMatchObject({
      message: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
      status: 429,
      retryAfter: 37,
    });
  });

  it("정상 JSON 응답은 데이터와 모드를 반환한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse({
      status: 200,
      body: JSON.stringify({ data: { title: "가을 놀이" }, mode: "demo" }),
    })));

    await expect(postGeneration<{ title: string }>("/api/generate/event-plan", {})).resolves.toEqual({
      data: { title: "가을 놀이" },
      mode: "demo",
    });
  });
});
