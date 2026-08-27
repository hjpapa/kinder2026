"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { DraftManager } from "@/components/draft-manager";
import { EditableDocument } from "@/components/editable-document";
import { Field, FormSection, SelectInput, TextArea, TextInput } from "@/components/form-controls";
import { PrivacyNotice } from "@/components/privacy-notice";
import { StepIndicator } from "@/components/step-indicator";
import { postGeneration, type GenerationMode } from "@/lib/api-client";
import { incrementRequestStat, readStorage, removeStorage } from "@/lib/client-storage";
import { parentNoticeSections, parseEditableDocumentState, type EditableDocumentState } from "@/lib/document-sections";
import { demoParentNoticeResult } from "@/lib/demo-data";
import type { ParentNoticeInput, ParentNoticeResult } from "@/lib/schemas";
import { settingsToStyleContext, useAppSettings } from "@/hooks/use-app-settings";
import { useAutoDraft } from "@/hooks/use-auto-draft";

type NoticeForm = Omit<ParentNoticeInput, "styleContext">;
const initialForm: NoticeForm = { eventName: "", eventSummary: "", audience: "학부모", tone: "따뜻하게", confirmedDetails: "" };

export function ParentNoticeWorkspace() {
  const settings = useAppSettings();
  const [form, setForm] = useState<NoticeForm>(initialForm);
  const [result, setResult] = useState<ParentNoticeResult | null>(null);
  const [mode, setMode] = useState<GenerationMode>("live");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallbackAvailable, setFallbackAvailable] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [documentState, setDocumentState] = useState<EditableDocumentState | null>(null);
  const [documentRevision, setDocumentRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const transfer = readStorage<Partial<NoticeForm> | null>("parent-notice-transfer", null);
    if (!transfer) return;
    const timer = window.setTimeout(() => { setForm((current) => ({ ...current, ...transfer })); removeStorage("parent-notice-transfer"); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const input: ParentNoticeInput = useMemo(() => ({ ...form, styleContext: settingsToStyleContext(settings) }), [form, settings]);
  const sections = useMemo(() => result ? parentNoticeSections(result) : [], [result]);
  const draftData = useMemo(() => ({ form, result, mode, document: documentState }), [form, result, mode, documentState]);
  useAutoDraft("parent-notice", draftData, settings.autoSave);
  const step = loading ? 2 : documentState?.reviewed ? 4 : result ? 3 : 1;

  function update<K extends keyof NoticeForm>(key: K, value: NoticeForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setConfirmed(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!confirmed) { setError("발송 전 사실 확인에 동의해 주세요."); return; }
    controller.current?.abort(); controller.current = new AbortController(); setLoading(true); setError(""); setFallbackAvailable(false);
    try {
      const generated = await postGeneration<ParentNoticeResult>("/api/generate/parent-notice", input, controller.current.signal);
      setResult(generated.data); setMode(generated.mode); setDocumentState(null); setDocumentRevision((value) => value + 1); incrementRequestStat("parent-notice");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "초안을 만들지 못했습니다.");
      setFallbackAvailable(Boolean((reason as Error & { fallbackAvailable?: boolean })?.fallbackAvailable));
    } finally { setLoading(false); }
  }

  return <div><div className="mb-5 flex overflow-x-auto"><StepIndicator current={step} /></div><div className="grid gap-6 lg:grid-cols-2 lg:items-start"><form onSubmit={submit} className="grid gap-5"><PrivacyNotice compact /><FormSection title="안내문 기본 정보"><Field label="행사명" htmlFor="notice-event-name" required><TextInput id="notice-event-name" value={form.eventName} onChange={(event) => update("eventName", event.target.value)} required /></Field><Field label="계획서·행사 요약" htmlFor="event-summary" required><TextArea id="event-summary" value={form.eventSummary} onChange={(event) => update("eventSummary", event.target.value)} required maxLength={8000} className="min-h-52" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="대상" htmlFor="notice-audience"><TextInput id="notice-audience" value={form.audience} onChange={(event) => update("audience", event.target.value)} /></Field><Field label="문체" htmlFor="notice-tone"><SelectInput id="notice-tone" value={form.tone} onChange={(event) => update("tone", event.target.value as NoticeForm["tone"])}><option>따뜻하게</option><option>담백하게</option><option>공식적으로</option></SelectInput></Field></div><Field label="확정된 날짜·장소·준비물" htmlFor="confirmed-details" hint="확정된 내용만 적어 주세요. 비어 있으면 추가 정보 필요로 표시합니다."><TextArea id="confirmed-details" value={form.confirmedDetails} onChange={(event) => update("confirmedDetails", event.target.value)} /></Field></FormSection><label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm leading-6"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-4 accent-[var(--sage)]" /><span>발송 전에 일시·장소·준비물·사진 촬영·문의 방법을 기관 정보와 대조하겠습니다.</span></label><div className="no-print flex gap-3"><button disabled={loading} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--sage-dark)] px-6 text-lg font-black text-white disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />} {loading ? "학부모 안내 내용을 정리하고 있습니다…" : "가정통신문 초안 만들기"}</button>{loading && <button type="button" onClick={() => controller.current?.abort()} className="action-button">취소</button>}</div>{error && <div className="rounded-xl border border-[#e7b3a8] bg-[#fff1ed] p-4 text-sm font-semibold text-[#8b3026]" role="alert">{error}{fallbackAvailable && <button type="button" onClick={() => { setResult(demoParentNoticeResult); setMode("demo"); setDocumentState(null); setDocumentRevision((value) => value + 1); setError(""); }} className="ml-3 underline">시연용 샘플 불러오기</button>}</div>}<DraftManager kind="parent-notice" suggestedName={form.eventName || "가정통신문"} data={draftData} onLoad={(value) => { const restored = value as { form: NoticeForm; result: ParentNoticeResult | null; mode: GenerationMode; document?: unknown }; setForm(restored.form); setResult(restored.result); setMode(restored.mode); setDocumentState(parseEditableDocumentState(restored.document)); setDocumentRevision((revision) => revision + 1); setConfirmed(false); }} /></form><div className="lg:sticky lg:top-5">{result ? <EditableDocument key={`document-${documentRevision}`} title={settings.customDocumentTitle || result.title} sections={sections} mode={mode} prefix="가정통신문" initialDocument={documentState} onDocumentChange={setDocumentState} /> : <div className="grid min-h-[30rem] place-items-center rounded-[2rem] border border-dashed border-[#b8c8be] bg-[rgba(255,253,248,0.7)] p-8 text-center"><div><Sparkles className="mx-auto text-[var(--sage)]" size={34} aria-hidden="true" /><h2 className="mt-4 text-xl font-black">학부모 안내의 핵심만 먼저 정리합니다</h2><p className="mt-2 max-w-sm leading-7 text-[var(--muted)]">확정되지 않은 일시와 준비물은 그럴듯하게 채우지 않고 발송 전 확인 항목으로 남깁니다.</p></div></div>}</div></div></div>;
}
