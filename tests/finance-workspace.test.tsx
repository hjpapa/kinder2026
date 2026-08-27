import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceWorkspace } from "@/components/finance-workspace";
import type { ApprovalResult } from "@/lib/schemas";

const approvalResult: ApprovalResult = {
  documentTitle: "가을 미술재료 예상 품의서",
  purpose: "가을 자연물 표현 활동에 필요한 미술재료를 준비하고자 합니다.",
  purchaseSummary: "색지와 투명테이프를 구입할 예정입니다.",
  suggestedItems: [],
  expectedEffects: ["다양한 재료를 활용한 표현 활동을 지원합니다."],
  confirmationChecklist: ["예산 과목 확인"],
  reviewFlags: [],
  guidelineReferences: [],
};

function response(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

describe("품의·정산 작업 화면", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("건명과 한 줄 메모만으로 예상 품의서를 생성한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ data: approvalResult, mode: "live" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<FinanceWorkspace />);

    fireEvent.change(screen.getByLabelText(/품의 건명/), { target: { value: "가을 미술재료 구입" } });
    fireEvent.change(screen.getByLabelText(/무엇을, 왜 구입하나요/), { target: { value: "자연물 콜라주 활동에 사용할 색지와 테이프를 구입합니다." } });
    fireEvent.click(screen.getByRole("button", { name: "예상 품의서 만들기" }));

    expect((await screen.findAllByText("가을 미술재료 예상 품의서")).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(options.body)) as { subject: string; memo: string; items: unknown[] };
    expect(body.subject).toBe("가을 미술재료 구입");
    expect(body.memo).toContain("자연물 콜라주");
    expect(body.items).toEqual([]);
  });

  it("정산 탭은 영수증과 개인정보 전송 동의가 없으면 호출하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<FinanceWorkspace />);
    fireEvent.click(screen.getByRole("tab", { name: "영수증 정산" }));
    fireEvent.change(screen.getByLabelText(/정산 건명/), { target: { value: "미술재료 정산" } });
    fireEvent.click(screen.getByRole("button", { name: "영수증 읽기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("영수증 이미지를 1장 이상");
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });
});
