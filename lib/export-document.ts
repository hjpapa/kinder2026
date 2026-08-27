"use client";

import type { DocumentSection } from "@/lib/document-sections";

export function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_").slice(0, 80) || "문서";
}

export function sectionsToMarkdown(title: string, sections: DocumentSection[]) {
  return `# ${title}\n\n${sections.map((section) => `## ${section.title}\n\n${section.content}`).join("\n\n---\n\n")}\n`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(title: string, sections: DocumentSection[], prefix: string) {
  downloadBlob(new Blob([sectionsToMarkdown(title, sections)], { type: "text/markdown;charset=utf-8" }), `${prefix}_${sanitizeFilename(title)}.md`);
}

export function downloadJson(value: unknown, filename: string) {
  downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" }), `${sanitizeFilename(filename)}.json`);
}

export async function createDocxBlob(title: string, sections: DocumentSection[]) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const children = [new Paragraph({ text: title, heading: HeadingLevel.TITLE })];
  for (const section of sections) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }));
    for (const line of section.content.split("\n")) {
      const clean = line.replace(/^#{1,4}\s*/, "").replace(/^[-*]\s*/, "• ");
      children.push(new Paragraph({ children: [new TextRun({ text: clean || " " })], spacing: { after: 100 } }));
    }
  }
  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBlob(doc);
}

export async function downloadDocx(title: string, sections: DocumentSection[], prefix: string) {
  downloadBlob(await createDocxBlob(title, sections), `${prefix}_${sanitizeFilename(title)}.docx`);
}
