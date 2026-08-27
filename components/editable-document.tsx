"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { CheckCircle2, Clipboard, Download, Eye, FileDown, ImageDown, PencilLine, Printer, RotateCcw } from "lucide-react";
import { DocumentSectionPreview } from "@/components/document-section-preview";
import { downloadDocx, downloadMarkdown, downloadSummaryCardPng, sectionsToMarkdown } from "@/lib/export-document";
import type { DocumentSection, EditableDocumentState } from "@/lib/document-sections";
import type { GenerationMode } from "@/lib/api-client";

type RichDocumentSection = DocumentSection & {
  layout?: "prose" | "lead" | "table" | "cards" | "checklist" | "photo-grid";
  accent?: "sage" | "sun" | "sky" | "clay";
  photoSlots?: Array<{ id: string; label: string; caption?: string }>;
};

function mergeInitialSections(baseSections: RichDocumentSection[], storedSections?: DocumentSection[]) {
  if (!storedSections?.length) return baseSections;
  const baseById = new Map(baseSections.map((section) => [section.id, section]));
  const storedIds = new Set(storedSections.map((section) => section.id));
  const restored = storedSections.map((stored) => {
    const base = baseById.get(stored.id);
    if (!base) return stored as RichDocumentSection;
    const richStored = stored as RichDocumentSection;
    return {
      ...base,
      ...richStored,
      layout: richStored.layout || base.layout,
      accent: richStored.accent || base.accent,
      photoSlots: richStored.photoSlots?.length ? richStored.photoSlots : base.photoSlots,
    };
  });
  return [...restored, ...baseSections.filter((section) => !storedIds.has(section.id))];
}

export function EditableDocument({ title, sections, mode, prefix, initialDocument, onDocumentChange, extraActions }: { title: string; sections: RichDocumentSection[]; mode: GenerationMode; prefix: string; initialDocument?: EditableDocumentState | null; onDocumentChange?: (value: EditableDocumentState) => void; extraActions?: React.ReactNode }) {
  const [edited, setEdited] = useState(() => mergeInitialSections(sections, initialDocument?.sections));
  const [activeId, setActiveId] = useState(initialDocument?.sections[0]?.id || sections[0]?.id || "");
  const [reviewed, setReviewed] = useState(initialDocument?.reviewed ?? false);
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
  const active = edited.find((section) => section.id === activeId) || edited[0];

  function updateSections(next: RichDocumentSection[]) {
    setEdited(next);
    onDocumentChange?.({ sections: next, reviewed });
  }

  function updateReviewed(next: boolean) {
    setReviewed(next);
    onDocumentChange?.({ sections: edited, reviewed: next });
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = edited.length - 1;
    const nextIndex = event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
        : event.key === "Home" ? 0
          : event.key === "End" ? last
            : null;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = edited[nextIndex];
    setActiveId(next.id);
    window.requestAnimationFrame(() => document.getElementById(`tab-${prefix}-${next.id}`)?.focus());
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("클립보드에 복사했습니다.");
  }

  if (!active) return null;
  return (
    <section className="print-document-host paper-card rounded-[1.8rem_2.05rem_1.7rem_1.95rem] p-5 pt-7 md:p-7 md:pt-9">
      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${mode === "demo" ? "bg-[var(--sun-soft)] text-[#815516]" : "bg-[var(--sage-soft)] text-[var(--sage-dark)]"}`}>{mode === "demo" ? "시연용 샘플" : "실제 AI 생성"}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${reviewed ? "bg-[#e4f2ff] text-[#1f5f86]" : "bg-[#fae8e2] text-[#8c4d3a]"}`}><CheckCircle2 size={13} aria-hidden="true" /> {reviewed ? "교사 검토 완료" : "AI 초안"}</span>
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-[-0.025em]">{title}</h2>
        </div>
        <label className="no-print inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-bold">
          <input type="checkbox" checked={reviewed} onChange={(event) => updateReviewed(event.target.checked)} className="size-4 accent-[var(--sage)]" /> 교사 확인 완료
        </label>
      </div>

      <div className="no-print mt-6 flex w-fit rounded-xl border border-[var(--line)] bg-white p-1" aria-label="문서 표시 방식">
        <button type="button" aria-pressed={viewMode === "preview"} onClick={() => setViewMode("preview")} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold ${viewMode === "preview" ? "bg-[var(--sage-dark)] text-white" : "text-[var(--muted)] hover:bg-[var(--sage-soft)]"}`}><Eye size={16} aria-hidden="true" /> 문서 보기</button>
        <button type="button" aria-pressed={viewMode === "edit"} onClick={() => setViewMode("edit")} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold ${viewMode === "edit" ? "bg-[var(--sage-dark)] text-white" : "text-[var(--muted)] hover:bg-[var(--sage-soft)]"}`}><PencilLine size={16} aria-hidden="true" /> 내용 수정</button>
      </div>

      {viewMode === "preview" ? (
        <div className="no-print mt-5" role="document" aria-label={`${title} 미리보기`}>
          <nav className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="문서 목차">
            {edited.map((section) => <a key={section.id} href={`#preview-${prefix}-${section.id}`} className="shrink-0 rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs font-bold text-[var(--sage-dark)] hover:border-[var(--sage)]">{section.title}</a>)}
          </nav>
          <article className="rounded-[1.4rem] border border-[#d4ddd6] bg-[rgba(255,255,252,0.92)] px-5 py-7 shadow-[0_10px_28px_rgba(55,66,59,0.07)] md:px-7">
            <header className="mb-8 border-b-2 border-[var(--sage)] pb-5 text-center">
              <p className="text-xs font-black tracking-[0.18em] text-[var(--sage-dark)]">도담비서 : 누리</p>
              <h3 className="mt-2 text-2xl font-black tracking-[-0.025em]">{title}</h3>
            </header>
            <div className="grid gap-8">{edited.map((section) => <DocumentSectionPreview key={section.id} section={section} anchorId={`preview-${prefix}-${section.id}`} />)}</div>
          </article>
        </div>
      ) : (
        <div className="no-print">
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="결과 항목">
            {edited.map((section, index) => <button type="button" key={section.id} id={`tab-${prefix}-${section.id}`} role="tab" aria-selected={section.id === active.id} aria-controls={`panel-${prefix}-${section.id}`} tabIndex={section.id === active.id ? 0 : -1} onClick={() => setActiveId(section.id)} onKeyDown={(event) => handleTabKeyDown(event, index)} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold ${section.id === active.id ? "bg-[var(--ink)] text-white" : "border border-[var(--line)] bg-white hover:border-[var(--sage)]"}`}>{section.title}</button>)}
          </div>
          <div id={`panel-${prefix}-${active.id}`} role="tabpanel" aria-labelledby={`tab-${prefix}-${active.id}`} className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`editable-${prefix}-${active.id}`} className="font-black">{active.title}</label>
              <button type="button" onClick={() => copy(active.content)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-[var(--sage-dark)] hover:bg-[var(--sage-soft)]"><Clipboard size={17} aria-hidden="true" /> 항목 복사</button>
            </div>
            <textarea id={`editable-${prefix}-${active.id}`} value={active.content} onChange={(event) => updateSections(edited.map((section) => section.id === active.id ? { ...section, content: event.target.value } : section))} className="mt-2 min-h-[28rem] w-full resize-y rounded-[1rem_1.1rem_0.95rem_1.05rem] border border-[#b8c8be] bg-[rgba(255,255,252,0.94)] p-5 text-sm leading-7" />
          </div>
        </div>
      )}

      <div className="no-print mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => copy(sectionsToMarkdown(title, edited))} className="action-button"><Clipboard size={17} aria-hidden="true" /> 전체 복사</button>
        <button type="button" onClick={() => downloadMarkdown(title, edited, prefix)} className="action-button"><Download size={17} aria-hidden="true" /> Markdown</button>
        <button type="button" onClick={() => downloadDocx(title, edited, prefix).catch(() => setMessage("DOCX 파일을 만들지 못했습니다."))} className="action-button"><FileDown size={17} aria-hidden="true" /> DOCX</button>
        <button type="button" onClick={() => downloadSummaryCardPng(title, edited, prefix).catch(() => setMessage("요약 카드를 만들지 못했습니다."))} className="action-button"><ImageDown size={17} aria-hidden="true" /> 요약 카드 PNG</button>
        <button type="button" onClick={() => window.print()} className="action-button"><Printer size={17} aria-hidden="true" /> 인쇄</button>
        <button type="button" onClick={() => { setEdited(sections); setActiveId(sections[0]?.id || ""); setReviewed(false); setViewMode("preview"); onDocumentChange?.({ sections, reviewed: false }); setMessage("AI 초안으로 되돌렸습니다."); }} className="action-button"><RotateCcw size={17} aria-hidden="true" /> 원본으로</button>
        {extraActions}
      </div>
      <p className="no-print mt-3 text-sm font-semibold text-[var(--sage-dark)]" aria-live="polite">{message}</p>

      <div className="print-only" aria-hidden="true">
        <header className="mb-8 border-b-2 border-[#315642] pb-5 text-center">
          <p className="text-xs font-bold">도담비서 : 누리</p>
          <h1>{title}</h1>
        </header>
        <div className="grid gap-8">{edited.map((section) => <DocumentSectionPreview key={section.id} section={section} />)}</div>
      </div>
    </section>
  );
}
