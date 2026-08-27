"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { CheckCircle2, Clipboard, Download, FileDown, Printer, RotateCcw } from "lucide-react";
import { downloadDocx, downloadMarkdown, sectionsToMarkdown } from "@/lib/export-document";
import type { DocumentSection, EditableDocumentState } from "@/lib/document-sections";
import type { GenerationMode } from "@/lib/api-client";

export function EditableDocument({ title, sections, mode, prefix, initialDocument, onDocumentChange, extraActions }: { title: string; sections: DocumentSection[]; mode: GenerationMode; prefix: string; initialDocument?: EditableDocumentState | null; onDocumentChange?: (value: EditableDocumentState) => void; extraActions?: React.ReactNode }) {
  const initialSections = initialDocument?.sections.length ? initialDocument.sections : sections;
  const [edited, setEdited] = useState(initialSections);
  const [activeId, setActiveId] = useState(initialSections[0]?.id || "");
  const [reviewed, setReviewed] = useState(initialDocument?.reviewed ?? false);
  const [message, setMessage] = useState("");
  const active = edited.find((section) => section.id === activeId) || edited[0];

  function updateSections(next: DocumentSection[]) {
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
    <section className="paper-card rounded-[1.8rem_2.05rem_1.7rem_1.95rem] p-5 pt-7 md:p-7 md:pt-9">
      <div className="flex flex-wrap items-start justify-between gap-4">
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

      <div className="no-print mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="결과 항목">
        {edited.map((section, index) => <button type="button" key={section.id} id={`tab-${prefix}-${section.id}`} role="tab" aria-selected={section.id === active.id} aria-controls={`panel-${prefix}-${section.id}`} tabIndex={section.id === active.id ? 0 : -1} onClick={() => setActiveId(section.id)} onKeyDown={(event) => handleTabKeyDown(event, index)} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold ${section.id === active.id ? "bg-[var(--ink)] text-white" : "border border-[var(--line)] bg-white hover:border-[var(--sage)]"}`}>{section.title}</button>)}
      </div>

      <div id={`panel-${prefix}-${active.id}`} role="tabpanel" aria-labelledby={`tab-${prefix}-${active.id}`} className="no-print mt-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`editable-${active.id}`} className="font-black">{active.title}</label>
          <button type="button" onClick={() => copy(active.content)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-[var(--sage-dark)] hover:bg-[var(--sage-soft)]"><Clipboard size={17} aria-hidden="true" /> 항목 복사</button>
        </div>
        <textarea id={`editable-${active.id}`} value={active.content} onChange={(event) => updateSections(edited.map((section) => section.id === active.id ? { ...section, content: event.target.value } : section))} className="mt-2 min-h-[28rem] w-full resize-y rounded-[1rem_1.1rem_0.95rem_1.05rem] border border-[#b8c8be] bg-[rgba(255,255,252,0.94)] p-5 text-sm leading-7" />
      </div>

      <div className="no-print mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => copy(sectionsToMarkdown(title, edited))} className="action-button"><Clipboard size={17} aria-hidden="true" /> 전체 복사</button>
        <button type="button" onClick={() => downloadMarkdown(title, edited, prefix)} className="action-button"><Download size={17} aria-hidden="true" /> Markdown</button>
        <button type="button" onClick={() => downloadDocx(title, edited, prefix).catch(() => setMessage("DOCX 파일을 만들지 못했습니다."))} className="action-button"><FileDown size={17} aria-hidden="true" /> DOCX</button>
        <button type="button" onClick={() => window.print()} className="action-button"><Printer size={17} aria-hidden="true" /> 인쇄</button>
        <button type="button" onClick={() => { setEdited(sections); setActiveId(sections[0]?.id || ""); setReviewed(false); onDocumentChange?.({ sections, reviewed: false }); setMessage("AI 초안으로 되돌렸습니다."); }} className="action-button"><RotateCcw size={17} aria-hidden="true" /> 원본으로</button>
        {extraActions}
      </div>
      <p className="no-print mt-3 text-sm font-semibold text-[var(--sage-dark)]" aria-live="polite">{message}</p>

      <div className="print-only">
        <h1>{title}</h1>
        {edited.map((section) => <section key={section.id}><h2>{section.title}</h2><pre>{section.content}</pre></section>)}
      </div>
    </section>
  );
}
