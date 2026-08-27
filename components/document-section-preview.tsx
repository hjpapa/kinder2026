import type { ReactNode } from "react";
import { Camera } from "lucide-react";
import { parseDocumentContent, parseInlineText, type DocumentBlock } from "@/lib/document-content";
import type { DocumentSection } from "@/lib/document-sections";

type RichDocumentSection = DocumentSection & {
  layout?: "prose" | "lead" | "table" | "cards" | "checklist" | "photo-grid";
  accent?: "sage" | "sun" | "sky" | "clay";
  photoSlots?: Array<{ id: string; label: string; caption?: string }>;
};

const accentClasses = {
  sage: "border-[#bdd4c7] bg-[#f3f8f4]",
  sun: "border-[#ead2a2] bg-[#fff8e8]",
  sky: "border-[#bdd7e5] bg-[#f1f8fc]",
  clay: "border-[#e5c5bb] bg-[#fff4f0]",
} as const;

function InlineText({ value }: { value: string }) {
  return <>{parseInlineText(value).map((part, index) => part.bold ? <strong key={`${index}-${part.text}`}>{part.text}</strong> : <span key={`${index}-${part.text}`}>{part.text}</span>)}</>;
}

function DocumentTable({ block }: { block: Extract<DocumentBlock, { type: "table" }> }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#c7d4cb] bg-white">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm leading-6">
        <thead className="bg-[#e4eee7] text-[#294b39]">
          <tr>{block.headers.map((header, index) => <th key={`${index}-${header}`} scope="col" className="border-b border-r border-[#c7d4cb] px-3 py-2.5 font-black last:border-r-0"><InlineText value={header} /></th>)}</tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row.join("-")}`} className="align-top even:bg-[#fafcf9]">
              {row.map((cell, cellIndex) => cellIndex === 0
                ? <th key={`${cellIndex}-${cell}`} scope="row" className="border-b border-r border-[#d8e1da] px-3 py-2.5 font-bold last:border-r-0"><InlineText value={cell || "추가 정보 필요"} /></th>
                : <td key={`${cellIndex}-${cell}`} className="whitespace-pre-line border-b border-r border-[#d8e1da] px-3 py-2.5 last:border-r-0"><InlineText value={cell || "추가 정보 필요"} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockView({ block }: { block: DocumentBlock }) {
  if (block.type === "subheading") return <h4 className="mt-5 text-base font-black text-[var(--sage-dark)] first:mt-0"><InlineText value={block.text} /></h4>;
  if (block.type === "table") return <DocumentTable block={block} />;
  if (block.type === "bullets") return <ul className="grid gap-2 pl-5 text-sm leading-7 marker:text-[var(--sage)]">{block.items.map((item, index) => <li key={`${index}-${item}`}><InlineText value={item} /></li>)}</ul>;
  if (block.type === "checklist") return <ul className="grid gap-2" aria-label="확인 목록">{block.items.map((item, index) => <li key={`${index}-${item.text}`} className="flex gap-2.5 text-sm leading-7"><span aria-hidden="true" className={`mt-1 grid size-5 shrink-0 place-items-center rounded-md border font-black ${item.checked ? "border-[var(--sage)] bg-[var(--sage)] text-white" : "border-[#9caf9f] bg-white"}`}>{item.checked ? "✓" : ""}</span><span><InlineText value={item.text} /></span></li>)}</ul>;
  return <p className="whitespace-pre-line text-sm leading-7"><InlineText value={block.text} /></p>;
}

function CardBlocks({ blocks, accent }: { blocks: DocumentBlock[]; accent: keyof typeof accentClasses }) {
  const groups: Array<{ title: string; blocks: DocumentBlock[] }> = [];
  for (const block of blocks) {
    if (block.type === "subheading") {
      groups.push({ title: block.text, blocks: [] });
      continue;
    }
    if (!groups.length) groups.push({ title: "", blocks: [] });
    groups[groups.length - 1].blocks.push(block);
  }

  if (groups.length === 1 && !groups[0].title && groups[0].blocks.length === 1 && groups[0].blocks[0].type === "bullets") {
    return <div className="grid gap-3 sm:grid-cols-2">{groups[0].blocks[0].items.map((item, index) => <div key={`${index}-${item}`} className={`rounded-2xl border p-4 text-sm leading-7 ${accentClasses[accent]}`}><InlineText value={item} /></div>)}</div>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((group, index) => <div key={`${index}-${group.title}`} className={`rounded-2xl border p-4 ${accentClasses[accent]}`}>{group.title ? <h4 className="mb-2 font-black text-[var(--sage-dark)]"><InlineText value={group.title} /></h4> : null}<div className="grid gap-3">{group.blocks.map((block, blockIndex) => <BlockView key={`${blockIndex}-${block.type}`} block={block} />)}</div></div>)}
    </div>
  );
}

function PhotoGrid({ slots }: { slots: NonNullable<RichDocumentSection["photoSlots"]> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {slots.map((slot, index) => (
        <figure key={slot.id} className="flex min-h-52 break-inside-avoid flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#aebfb3] bg-[rgba(255,255,252,0.8)] p-5 text-center" aria-label={`${slot.label} 사진 자리`}>
          <Camera aria-hidden="true" size={28} className="text-[#7b9685]" />
          <strong className="mt-3 text-sm">사진 {index + 1} · {slot.label}</strong>
          <figcaption className="mt-2 text-xs leading-5 text-[var(--muted)]">{slot.caption || "사진을 붙이고 설명을 적어 주세요."}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function DocumentSectionPreview({ section, className = "", anchorId }: { section: RichDocumentSection; className?: string; anchorId?: string }) {
  const blocks = parseDocumentContent(section.content);
  const layout = section.layout || "prose";
  const accent = section.accent || "sage";
  let body: ReactNode;

  if (layout === "cards") body = <CardBlocks blocks={blocks} accent={accent} />;
  else if (layout === "lead") body = <div className={`rounded-2xl border p-5 text-[1.02rem] leading-8 ${accentClasses[accent]}`}>{blocks.map((block, index) => <BlockView key={`${index}-${block.type}`} block={block} />)}</div>;
  else body = <div className="grid gap-4">{blocks.map((block, index) => <BlockView key={`${index}-${block.type}`} block={block} />)}</div>;

  return (
    <section id={anchorId} data-document-layout={layout} className={`break-inside-avoid scroll-mt-6 ${className}`}>
      <div className="mb-3 flex items-center gap-3">
        <span aria-hidden="true" className={`h-7 w-1.5 rounded-full ${accent === "sun" ? "bg-[#d9a943]" : accent === "sky" ? "bg-[#6f9fba]" : accent === "clay" ? "bg-[#c98773]" : "bg-[var(--sage)]"}`} />
        <h3 className="text-lg font-black tracking-[-0.015em]">{section.title}</h3>
      </div>
      {body}
      {layout === "photo-grid" && section.photoSlots?.length ? <div className={blocks.length ? "mt-4" : ""}><PhotoGrid slots={section.photoSlots} /></div> : null}
    </section>
  );
}
