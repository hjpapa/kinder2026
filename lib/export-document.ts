"use client";

import { documentContentToPlainText, parseDocumentContent, parseInlineText, type DocumentBlock } from "@/lib/document-content";
import type { DocumentSection } from "@/lib/document-sections";

type RichDocumentSection = DocumentSection & {
  layout?: "prose" | "lead" | "table" | "cards" | "checklist" | "photo-grid";
  accent?: "sage" | "sun" | "sky" | "clay";
  photoSlots?: Array<{ id: string; label: string; caption?: string }>;
};

export function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_").slice(0, 80) || "문서";
}

function photoSlotsToMarkdown(section: RichDocumentSection) {
  if (!section.photoSlots?.length) return "";
  return section.photoSlots.map((slot, index) => `> [사진 ${index + 1} 자리] ${slot.label}\n> ${slot.caption || "사진 설명을 적어 주세요."}`).join("\n\n");
}

export function sectionsToMarkdown(title: string, sections: RichDocumentSection[]) {
  return `# ${title}\n\n${sections.map((section) => {
    const photoSlots = photoSlotsToMarkdown(section);
    return `## ${section.title}\n\n${[section.content, photoSlots].filter(Boolean).join("\n\n")}`;
  }).join("\n\n---\n\n")}\n`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadMarkdown(title: string, sections: RichDocumentSection[], prefix: string) {
  downloadBlob(new Blob([sectionsToMarkdown(title, sections)], { type: "text/markdown;charset=utf-8" }), `${prefix}_${sanitizeFilename(title)}.md`);
}

export function downloadJson(value: unknown, filename: string) {
  downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" }), `${sanitizeFilename(filename)}.json`);
}

export async function createDocxBlob(title: string, sections: RichDocumentSection[]) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    HeadingLevel,
    HeightRule,
    PageNumber,
    PageOrientation,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
  } = await import("docx");

  type DocxChild = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;
  const colors = { ink: "263C31", sage: "315642", line: "B8C9BD", soft: "E5EFE8", muted: "607268" };
  const regularBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: colors.line },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: colors.line },
    left: { style: BorderStyle.SINGLE, size: 4, color: colors.line },
    right: { style: BorderStyle.SINGLE, size: 4, color: colors.line },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 3, color: "D9E2DB" },
    insideVertical: { style: BorderStyle.SINGLE, size: 3, color: "D9E2DB" },
  };
  const photoBorders = {
    top: { style: BorderStyle.DASHED, size: 8, color: "91A79A" },
    bottom: { style: BorderStyle.DASHED, size: 8, color: "91A79A" },
    left: { style: BorderStyle.DASHED, size: 8, color: "91A79A" },
    right: { style: BorderStyle.DASHED, size: 8, color: "91A79A" },
  };

  const runs = (value: string, options?: { color?: string; size?: number; bold?: boolean }) => parseInlineText(value).map((part) => new TextRun({
    text: part.text,
    bold: options?.bold || part.bold,
    color: options?.color,
    size: options?.size,
    font: "Malgun Gothic",
    language: { eastAsia: "ko-KR" },
  }));

  const cellParagraph = (value: string, options?: { bold?: boolean; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string }) => new Paragraph({
    children: runs(value || "추가 정보 필요", { bold: options?.bold, color: options?.color, size: 19 }),
    alignment: options?.alignment,
    spacing: { after: 40, line: 290 },
  });

  const tableFromBlock = (block: Extract<DocumentBlock, { type: "table" }>) => {
    const header = new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: block.headers.map((value) => new TableCell({
        shading: { fill: colors.soft, color: "auto", type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 110, bottom: 110, left: 120, right: 120 },
        children: [cellParagraph(value, { bold: true, alignment: AlignmentType.CENTER, color: colors.sage })],
      })),
    });
    const rows = block.rows.map((row) => new TableRow({
      cantSplit: true,
      children: block.headers.map((_, index) => new TableCell({
        shading: index === 0 ? { fill: "F4F8F5", color: "auto", type: ShadingType.CLEAR } : undefined,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [cellParagraph(row[index] || "추가 정보 필요", { bold: index === 0 })],
      })),
    }));
    return new Table({
      rows: [header, ...rows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.AUTOFIT,
      borders: regularBorders,
    });
  };

  const blocksToChildren = (blocks: DocumentBlock[], layout?: RichDocumentSection["layout"]): DocxChild[] => {
    const children: DocxChild[] = [];
    for (const block of blocks) {
      if (block.type === "table") {
        children.push(tableFromBlock(block));
        children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
      } else if (block.type === "subheading") {
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 90 }, keepNext: true }));
      } else if (block.type === "bullets") {
        children.push(...block.items.map((item) => new Paragraph({ children: runs(item), bullet: { level: 0 }, spacing: { after: 70, line: 310 } })));
      } else if (block.type === "checklist") {
        children.push(...block.items.map((item) => new Paragraph({ children: runs(`${item.checked ? "☑" : "☐"} ${item.text}`), spacing: { after: 80, line: 310 } })));
      } else {
        children.push(...block.text.split("\n").map((line) => new Paragraph({
          children: runs(line || " ", layout === "lead" ? { size: 23 } : undefined),
          shading: layout === "lead" ? { fill: "F2F7F3", color: "auto", type: ShadingType.CLEAR } : undefined,
          indent: layout === "lead" ? { left: 180, right: 180 } : undefined,
          spacing: { after: 120, line: layout === "lead" ? 380 : 330 },
        })));
      }
    }
    return children;
  };

  const photoGrid = (slots: NonNullable<RichDocumentSection["photoSlots"]>) => {
    const rows: InstanceType<typeof TableRow>[] = [];
    for (let index = 0; index < slots.length; index += 2) {
      const pair = slots.slice(index, index + 2);
      while (pair.length < 2) pair.push({ id: `empty-${index}`, label: "추가 사진", caption: "사진 설명을 적어 주세요." });
      rows.push(new TableRow({
        cantSplit: true,
        height: { value: 2800, rule: HeightRule.ATLEAST },
        children: pair.map((slot, pairIndex) => new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          borders: photoBorders,
          margins: { top: 180, bottom: 180, left: 160, right: 160 },
          children: [
            cellParagraph(`[ 사진 ${index + pairIndex + 1} 자리 ]`, { bold: true, alignment: AlignmentType.CENTER, color: colors.sage }),
            cellParagraph(slot.label, { bold: true, alignment: AlignmentType.CENTER }),
            cellParagraph(slot.caption || "사진을 붙이고 설명을 적어 주세요.", { alignment: AlignmentType.CENTER, color: colors.muted }),
          ],
        })),
      }));
    }
    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [4600, 4600],
      layout: TableLayoutType.FIXED,
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
      },
      cellSpacing: { value: 160, type: "dxa" },
    });
  };

  const children: DocxChild[] = [
    new Paragraph({ text: "도담비서 : 누리", alignment: AlignmentType.CENTER, spacing: { after: 120 }, style: "DocumentBrand" }),
    new Paragraph({ text: title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 360 } }),
  ];

  for (const section of sections) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 140 }, keepNext: true }));
    children.push(...blocksToChildren(parseDocumentContent(section.content), section.layout));
    if (section.layout === "photo-grid" && section.photoSlots?.length) {
      children.push(photoGrid(section.photoSlots));
      children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
    }
  }

  const widestTable = sections.flatMap((section) => parseDocumentContent(section.content)).reduce((width, block) => block.type === "table" ? Math.max(width, block.headers.length) : width, 0);
  const landscape = widestTable >= 5;
  const doc = new Document({
    creator: "도담비서 : 누리",
    title,
    description: "유치원 교사의 검토를 위한 문서 초안",
    styles: {
      default: {
        document: { run: { font: "Malgun Gothic", size: 21, color: colors.ink, language: { eastAsia: "ko-KR" } }, paragraph: { spacing: { line: 330 } } },
        title: { run: { font: "Malgun Gothic", size: 38, bold: true, color: colors.ink } },
        heading1: { run: { font: "Malgun Gothic", size: 28, bold: true, color: colors.sage }, paragraph: { keepNext: true } },
        heading2: { run: { font: "Malgun Gothic", size: 23, bold: true, color: colors.sage }, paragraph: { keepNext: true } },
      },
      paragraphStyles: [{
        id: "DocumentBrand",
        name: "Document Brand",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: "Malgun Gothic", size: 18, bold: true, color: colors.sage, characterSpacing: 60 },
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: landscape ? 16838 : 11906, height: landscape ? 11906 : 16838, orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
          margin: { top: 850, right: 850, bottom: 950, left: 850, header: 360, footer: 360, gutter: 0 },
        },
      },
      headers: { default: new Header({ children: [new Paragraph({ text: "도담비서 : 누리", alignment: AlignmentType.RIGHT, style: "DocumentBrand" })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "교사 검토용 초안  ·  ", color: colors.muted, size: 17 }), new TextRun({ children: [PageNumber.CURRENT], color: colors.muted, size: 17 })] })] }) },
      children,
    }],
  });
  return Packer.toBlob(doc);
}

export async function downloadDocx(title: string, sections: RichDocumentSection[], prefix: string) {
  downloadBlob(await createDocxBlob(title, sections), `${prefix}_${sanitizeFilename(title)}.docx`);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function wrapCanvasText(context: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) {
  const characters = Array.from(value.replace(/\s+/g, " ").trim());
  const lines: string[] = [];
  let line = "";
  for (const character of characters) {
    if (context.measureText(line + character).width <= maxWidth) {
      line += character;
      continue;
    }
    if (line) lines.push(line.trim());
    line = character;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line.trim()) lines.push(line.trim());
  if (lines.length === maxLines && characters.join("").length > lines.join("").length) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,\s]+$/, "")}…`;
  return lines;
}

export async function downloadSummaryCardPng(title: string, sections: RichDocumentSection[], prefix: string) {
  if (document.fonts) await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지 캔버스를 사용할 수 없습니다.");

  context.fillStyle = "#f7f2e8";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#dce9df";
  context.beginPath(); context.arc(940, 110, 170, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#f2dca8";
  context.beginPath(); context.arc(90, 1280, 155, 0, Math.PI * 2); context.fill();

  context.fillStyle = "#315642";
  context.font = "800 25px 'Malgun Gothic', sans-serif";
  context.fillText("도담비서 : 누리", 72, 85);
  context.fillStyle = "#263c31";
  context.font = "900 58px 'Malgun Gothic', sans-serif";
  const titleLines = wrapCanvasText(context, title, 890, 2);
  titleLines.forEach((line, index) => context.fillText(line, 72, 170 + index * 72));

  const excluded = /^(review|missing|guidelines|checklist|attachments|photos)$/;
  const summaries = sections.filter((section) => !excluded.test(section.id) && section.content.trim()).slice(0, 3);
  let top = titleLines.length > 1 ? 335 : 275;
  for (const [index, section] of summaries.entries()) {
    const height = 245;
    roundedRect(context, 64, top, 952, height, 30);
    context.fillStyle = index === 0 ? "#ffffff" : index === 1 ? "#f0f7f2" : "#fff8e8";
    context.fill();
    context.strokeStyle = index === 2 ? "#e5c987" : "#bfd0c4";
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = "#315642";
    context.font = "900 29px 'Malgun Gothic', sans-serif";
    context.fillText(section.title, 100, top + 58);
    context.fillStyle = "#34483d";
    context.font = "500 25px 'Malgun Gothic', sans-serif";
    const text = documentContentToPlainText(section.content);
    wrapCanvasText(context, text, 875, 4).forEach((line, lineIndex) => context.fillText(line, 100, top + 105 + lineIndex * 34));
    top += height + 24;
  }

  context.fillStyle = "#607268";
  context.font = "600 20px 'Malgun Gothic', sans-serif";
  context.fillText("AI 초안 · 교사의 확인과 수정을 거쳐 사용해 주세요.", 72, 1290);

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG 파일을 만들지 못했습니다.")), "image/png"));
  downloadBlob(blob, `${prefix}_${sanitizeFilename(title)}_요약카드.png`);
}
