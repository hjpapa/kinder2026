import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { createDocxBlob, sectionsToMarkdown } from "@/lib/export-document";

const richSections = [
  {
    id: "overview",
    title: "행사 개요",
    content: "| 항목 | 내용 |\n| --- | --- |\n| 장소 | 강당 |",
    layout: "table" as const,
  },
  {
    id: "checklist",
    title: "확인 목록",
    content: "- [ ] 영수증 확인\n- [x] 담당자 확인",
    layout: "checklist" as const,
  },
  {
    id: "photos",
    title: "행사 사진",
    content: "사진을 붙여 주세요.",
    layout: "photo-grid" as const,
    photoSlots: [
      { id: "overview-photo", label: "행사 전경", caption: "전체 운영 모습" },
      { id: "activity-photo", label: "주요 활동", caption: "활동 장면" },
    ],
  },
];

describe("구조화 문서 내보내기", () => {
  it("Markdown에도 사진 자리 정보를 보존한다", () => {
    const markdown = sectionsToMarkdown("행사 결과 보고서", richSections);
    expect(markdown).toContain("> [사진 1 자리] 행사 전경");
    expect(markdown).toContain("> 전체 운영 모습");
  });

  it("DOCX에 실제 표, 체크박스, 사진 표와 페이지 푸터를 만든다", async () => {
    const blob = await createDocxBlob("행사 결과 보고서", richSections);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file("word/document.xml")?.async("string");
    const stylesXml = await zip.file("word/styles.xml")?.async("string");
    const footerXml = await zip.file("word/footer1.xml")?.async("string");

    expect(documentXml).toBeTruthy();
    expect(documentXml).toContain("<w:tbl>");
    expect(documentXml).toContain("행사 전경");
    expect(documentXml).toContain("☐ 영수증 확인");
    expect(stylesXml).toContain("Malgun Gothic");
    expect(footerXml).toContain("PAGE");
  });
});
