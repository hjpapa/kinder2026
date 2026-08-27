import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditableDocument } from "@/components/editable-document";

describe("편집 문서 상태", () => {
  it("교사 수정 내용을 부모 저장 상태로 전달하고 일반 리렌더에서 보존한다", () => {
    const onChange = vi.fn();
    const sections = [{ id: "summary", title: "요약", content: "AI 원문" }];
    const view = render(<EditableDocument title="문서" sections={sections} mode="live" prefix="문서" onDocumentChange={onChange} />);

    fireEvent.change(screen.getByRole("textbox", { name: "요약" }), { target: { value: "교사가 수정한 문장" } });
    expect(onChange).toHaveBeenLastCalledWith({ sections: [{ ...sections[0], content: "교사가 수정한 문장" }], reviewed: false });

    view.rerender(<EditableDocument title="문서" sections={[...sections]} mode="live" prefix="문서" onDocumentChange={onChange} />);
    expect(screen.getByRole("textbox", { name: "요약" })).toHaveValue("교사가 수정한 문장");

    fireEvent.click(screen.getByLabelText("교사 확인 완료"));
    expect(onChange).toHaveBeenLastCalledWith({ sections: [{ ...sections[0], content: "교사가 수정한 문장" }], reviewed: true });
  });
});
