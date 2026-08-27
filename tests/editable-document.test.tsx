import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditableDocument } from "@/components/editable-document";

afterEach(cleanup);

describe("편집 문서 상태", () => {
  it("완성형 미리보기를 먼저 보여주고 교사 수정 내용을 부모 저장 상태로 전달한다", () => {
    const onChange = vi.fn();
    const sections = [{ id: "summary", title: "요약", content: "AI 원문" }];
    const view = render(<EditableDocument title="문서" sections={sections} mode="live" prefix="문서" onDocumentChange={onChange} />);

    expect(screen.getByRole("document", { name: "문서 미리보기" })).toHaveTextContent("AI 원문");
    expect(screen.queryByRole("textbox", { name: "요약" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "내용 수정" }));
    fireEvent.change(screen.getByRole("textbox", { name: "요약" }), { target: { value: "교사가 수정한 문장" } });
    expect(onChange).toHaveBeenLastCalledWith({ sections: [{ ...sections[0], content: "교사가 수정한 문장" }], reviewed: false });

    view.rerender(<EditableDocument title="문서" sections={[...sections]} mode="live" prefix="문서" onDocumentChange={onChange} />);
    expect(screen.getByRole("textbox", { name: "요약" })).toHaveValue("교사가 수정한 문장");

    fireEvent.click(screen.getByLabelText("교사 확인 완료"));
    expect(onChange).toHaveBeenLastCalledWith({ sections: [{ ...sections[0], content: "교사가 수정한 문장" }], reviewed: true });
  });

  it("Markdown 표를 실제 표로 표시한다", () => {
    const sections = [{ id: "overview", title: "행사 개요", content: "| 항목 | 내용 |\n| --- | --- |\n| 장소 | 강당 |", layout: "table" as const }];
    render(<EditableDocument title="행사 보고" sections={sections} mode="live" prefix="보고" />);

    const preview = screen.getByRole("document", { name: "행사 보고 미리보기" });
    expect(within(preview).getByRole("table")).toBeInTheDocument();
    expect(within(preview).getByRole("columnheader", { name: "항목" })).toBeInTheDocument();
    expect(within(preview).getByRole("rowheader", { name: "장소" })).toBeInTheDocument();
  });

  it("오래된 저장 내용에 새 레이아웃과 사진 섹션을 병합한다", () => {
    const sections = [
      { id: "summary", title: "운영 결과", content: "새 원문", layout: "lead" as const, accent: "sun" as const },
      { id: "photos", title: "행사 사진", content: "", layout: "photo-grid" as const, photoSlots: [{ id: "view", label: "행사 전경" }] },
    ];
    const initialDocument = { sections: [{ id: "summary", title: "운영 결과", content: "교사가 저장한 내용" }], reviewed: false };
    render(<EditableDocument title="행사 보고" sections={sections} mode="live" prefix="보고" initialDocument={initialDocument} />);

    const preview = screen.getByRole("document", { name: "행사 보고 미리보기" });
    expect(preview).toHaveTextContent("교사가 저장한 내용");
    expect(within(preview).getByLabelText("행사 전경 사진 자리")).toBeInTheDocument();
  });
});
