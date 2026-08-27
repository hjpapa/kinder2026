import { describe, expect, it } from "vitest";
import { documentContentToPlainText, parseDocumentContent, parseInlineText } from "@/lib/document-content";

describe("문서 내용 파서", () => {
  it("소제목, 목록, 체크박스와 문단을 순서대로 구조화한다", () => {
    const blocks = parseDocumentContent("### 준비\n- 이름표\n- 안내문\n\n- [ ] 담당자 확인\n- [x] 장소 확인\n\n일반 문단입니다.");

    expect(blocks).toEqual([
      { type: "subheading", level: 3, text: "준비" },
      { type: "bullets", items: ["이름표", "안내문"] },
      { type: "checklist", items: [{ text: "담당자 확인", checked: false }, { text: "장소 확인", checked: true }] },
      { type: "paragraph", text: "일반 문단입니다." },
    ]);
  });

  it("escaped pipe가 있는 Markdown 표를 실제 셀로 분리한다", () => {
    const blocks = parseDocumentContent("| 항목 | 내용 |\n| :--- | ---: |\n| 활동 | 투호 \\| 제기 |\n| 장소 | 강당 |");

    expect(blocks).toEqual([{ type: "table", headers: ["항목", "내용"], rows: [["활동", "투호 | 제기"], ["장소", "강당"]] }]);
  });

  it("형식이 잘못된 표와 HTML을 실행 가능한 마크업으로 해석하지 않는다", () => {
    const blocks = parseDocumentContent("| 표처럼 보이지만 | 구분선 없음 |\n<script>alert('x')</script>");

    expect(blocks).toEqual([{ type: "paragraph", text: "| 표처럼 보이지만 | 구분선 없음 |\n<script>alert('x')</script>" }]);
  });

  it("굵은 글씨 조각과 카드용 일반 텍스트를 만든다", () => {
    expect(parseInlineText("**중요** 내용을 확인")).toEqual([{ text: "중요", bold: true }, { text: " 내용을 확인", bold: false }]);
    expect(documentContentToPlainText("### 준비\n- **이름표**\n- 안내문")).toBe("준비\n이름표\n안내문");
  });
});
