import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaySupportImageGenerator } from "@/components/play-support-image-generator";

const props = {
  playName: "가을 놀이",
  age: "만 4세" as const,
  supportSummary: "자연물을 분류하고 전시하는 환경",
};

function response({ ok, status, body }: { ok: boolean; status: number; body: string }) {
  return { ok, status, text: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("놀이 지원자료 이미지 생성", () => {
  it("비JSON 오류 응답을 안전하게 처리한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ok: false, status: 502, body: "<html>Bad gateway</html>" })));
    render(<PlaySupportImageGenerator {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "이미지 생성" }));

    expect(await screen.findByText("이미지를 만들지 못했습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이미지 생성" })).toBeEnabled();
  });

  it("성공 상태의 빈 응답도 이미지 결과로 오인하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ok: true, status: 200, body: "" })));
    render(<PlaySupportImageGenerator {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "이미지 생성" }));

    expect(await screen.findByText("이미지 서버가 올바른 결과를 보내지 않았습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("fallbackAvailable 응답 뒤에만 명시적인 시연용 샘플 버튼을 제공한다", async () => {
    const context = {
      fillStyle: "",
      font: "",
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,demo");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      ok: false,
      status: 502,
      body: JSON.stringify({ error: "이미지 AI를 사용할 수 없습니다.", fallbackAvailable: true }),
    })));
    render(<PlaySupportImageGenerator {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "이미지 생성" }));
    const demoButton = await screen.findByRole("button", { name: "시연용 샘플 이미지 만들기" });
    fireEvent.click(demoButton);

    expect(screen.getByRole("img", { name: "가을 놀이 놀이 지원자료" })).toBeInTheDocument();
    expect(screen.getByText("시연용 샘플 이미지를 만들었습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "시연용 샘플 이미지 만들기" })).not.toBeInTheDocument();
  });

  it("진행 중인 요청을 취소하고 대기 상태로 정확히 돌아간다", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    })));
    render(<PlaySupportImageGenerator {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "이미지 생성" }));
    fireEvent.click(await screen.findByRole("button", { name: "취소" }));

    expect(await screen.findByText("이미지 생성을 취소했습니다.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "취소" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "이미지 생성" })).toBeEnabled();
  });
});
