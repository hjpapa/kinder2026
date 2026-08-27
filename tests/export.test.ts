import { describe, expect, it } from "vitest";
import { eventPlanSections, eventReportSections, observationSections } from "@/lib/document-sections";
import { demoEventPlanResult, demoEventReportResult, demoObservationResult } from "@/lib/demo-data";
import { createDocxBlob, sanitizeFilename, sectionsToMarkdown } from "@/lib/export-document";

describe("문서 내보내기", () => {
  it("화면 섹션을 같은 내용의 Markdown으로 만든다", () => {
    const markdown = sectionsToMarkdown(demoObservationResult.title, observationSections(demoObservationResult));
    expect(markdown).toContain("# 가을 택배소 놀이 기록");
    expect(markdown).toContain("## 객관적 관찰기록");
    expect(markdown).toContain("택배로 보내요");
  });

  it("계획 비교 없이 실제 결과와 사진 공간을 갖춘 보고서를 만든다", () => {
    const plan = sectionsToMarkdown(demoEventPlanResult.documentTitle, eventPlanSections(demoEventPlanResult));
    const report = sectionsToMarkdown(demoEventReportResult.documentTitle, eventReportSections(demoEventReportResult));
    expect(plan).toContain("담당자 확인 필요");
    expect(report).toContain("| 항목 | 내용 |");
    expect(report).toContain("## 주요 활동 내용");
    expect(report).toContain("[사진 1 자리] 행사 전경");
    expect(report).not.toContain("계획과 실제 운영의 차이");
    expect(report).not.toContain("계획 금액");
  });

  it("유효한 DOCX ZIP 파일을 만든다", async () => {
    const blob = await createDocxBlob("테스트 문서", [{ id: "one", title: "항목", content: "내용" }]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(1000);
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]);
  });

  it("파일명에 사용할 수 없는 문자를 제거한다", () => {
    expect(sanitizeFilename("행사:계획/초안?")).toBe("행사계획초안");
  });
});
