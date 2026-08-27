"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FileInput, LoaderCircle, Sparkles } from "lucide-react";
import { DraftManager } from "@/components/draft-manager";
import { EditableDocument } from "@/components/editable-document";
import { Field, FormSection, SelectInput, TextArea, TextInput } from "@/components/form-controls";
import { PrivacyNotice } from "@/components/privacy-notice";
import { StepIndicator } from "@/components/step-indicator";
import { postGeneration, type GenerationMode } from "@/lib/api-client";
import { incrementRequestStat, readStorage, removeStorage } from "@/lib/client-storage";
import { eventReportSections, parseEditableDocumentState, type DocumentSection, type EditableDocumentState } from "@/lib/document-sections";
import { demoEventReportResult } from "@/lib/demo-data";
import { parseEventReportResult } from "@/lib/event-report-migration";
import { downloadJson } from "@/lib/export-document";
import { needsConcreteEvidence } from "@/lib/privacy";
import type { EventPlanInput, EventReportInput, EventReportResult } from "@/lib/schemas";
import { settingsToStyleContext, useAppSettings } from "@/hooks/use-app-settings";
import { useAutoDraft } from "@/hooks/use-auto-draft";

type ReportForm = Omit<EventReportInput, "styleContext">;
const initialForm: ReportForm = {
  eventName: "", target: "", planSource: "", planObjectives: "", plannedDateTime: "", plannedPlace: "", plannedParticipants: "", plannedActivities: "", plannedRoles: "", plannedMaterials: "", plannedSafety: "",
  actualDateTime: "", actualPlace: "", actualParticipants: "", actualPersonInCharge: "", conditions: "", cancellationStatus: "운영", actualActivities: "", sequence: "", changes: "", changeReasons: "", omittedActivities: "", addedActivities: "",
  childBehaviors: "", childQuotes: "", repeatedActivities: "", difficulties: "", teacherSupport: "", safetyIncidents: "", safetyReflection: "", plannedBudgetTotal: null, actualBudgetTotal: null, budgetReason: "", evidenceDocuments: "",
  strengths: "", regrets: "", nextChanges: "", adaptationNotes: "",
};
const sampleActual: Partial<ReportForm> = {
  actualDateTime: "2026-09-18 10:00~11:40", actualPlace: "우천으로 강당", actualParticipants: "유아 57명, 교직원 8명", actualPersonInCharge: "행사 담당 교사", conditions: "비가 내려 실내 순환 방식으로 변경", cancellationStatus: "운영",
  actualActivities: "강당에서 제기차기, 투호, 비석치기를 연령별로 순환 운영했다.", sequence: "반별 이동 안내 후 세 활동을 순환하고 교실로 복귀했다.", changes: "보자기 매듭 놀이를 생략하고 실외 활동을 강당으로 옮겼다.", changeReasons: "우천과 실내 공간 제한", omittedActivities: "보자기 매듭 놀이", addedActivities: "대기 유아를 위한 전통무늬 카드 보기",
  childBehaviors: "일부 유아가 투호에 다시 참여했고 친구에게 던지는 위치를 설명했다.", childQuotes: "여기서 던지면 들어가.", repeatedActivities: "투호와 제기차기", difficulties: "활동 전환 때 대기 공간이 좁았음", teacherSupport: "대기선을 다시 표시하고 참여 순서를 안내함", safetyIncidents: "특이사항 없음", safetyReflection: "실내 전환 시 활동 사이 간격을 더 확보할 필요가 있음",
  actualBudgetTotal: 15000, budgetReason: "표시 테이프만 구입하고 기존 물품을 사용함", evidenceDocuments: "영수증, 참여 인원 확인표", strengths: "우천 시 실내 순환 방식으로 빠르게 전환함", regrets: "대기 공간과 소음 구역을 미리 분리하지 못함", nextChanges: "우천 대체 동선과 대기 구역 표지를 사전에 준비", adaptationNotes: "만 3세는 던지는 거리를 더 짧게 조정",
};

type Transfer = { input: EventPlanInput };

export function EventReportWorkspace() {
  const settings = useAppSettings();
  const [form, setForm] = useState<ReportForm>(initialForm);
  const [result, setResult] = useState<EventReportResult | null>(null);
  const [mode, setMode] = useState<GenerationMode>("live");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallbackAvailable, setFallbackAvailable] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [loadedBasics, setLoadedBasics] = useState(false);
  const [resultInput, setResultInput] = useState<EventReportInput | null>(null);
  const [documentState, setDocumentState] = useState<EditableDocumentState | null>(null);
  const [documentRevision, setDocumentRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);

  function applyTransfer(transfer: Transfer) {
    const { input } = transfer;
    setForm((current) => ({
      ...current,
      eventName: input.eventName,
      target: input.target,
      actualDateTime: [input.plannedDate, input.plannedTime].filter(Boolean).join(" "),
      actualPlace: input.place,
    }));
    setLoadedBasics(true);
  }

  useEffect(() => {
    const transfer = readStorage<Transfer | null>("event-report-transfer", null);
    if (!transfer?.input) return;
    const timer = window.setTimeout(() => { applyTransfer(transfer); removeStorage("event-report-transfer"); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const input: EventReportInput = useMemo(() => ({ ...form, planSource: form.planSource.slice(0, 15000), styleContext: settingsToStyleContext(settings) }), [form, settings]);
  const abstractWarning = needsConcreteEvidence([form.childBehaviors, form.childQuotes, form.repeatedActivities].join(" "));
  const draftData = useMemo(() => ({ form, result, mode, resultInput, document: documentState }), [form, result, mode, resultInput, documentState]);
  useAutoDraft("event-report", draftData, settings.autoSave);
  const step = loading ? 2 : documentState?.reviewed ? 4 : result ? 3 : 1;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!privacyConfirmed) { setError("개인정보와 교사 검토 확인에 동의해 주세요."); return; }
    controller.current?.abort(); controller.current = new AbortController(); setLoading(true); setError(""); setFallbackAvailable(false);
    try {
      const generated = await postGeneration<EventReportResult>("/api/generate/event-report", input, controller.current.signal);
      setResult(generated.data); setMode(generated.mode); setResultInput(input); setDocumentState(null); setDocumentRevision((value) => value + 1); incrementRequestStat("event-report");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "초안을 만들지 못했습니다.");
      setFallbackAvailable(Boolean((reason as Error & { fallbackAvailable?: boolean })?.fallbackAvailable));
    } finally { setLoading(false); }
  }

  const sections = useMemo(() => {
    if (!result) return [];
    const base = eventReportSections(result);
    const existing = new Set(base.map((section) => section.title));
    const custom = (resultInput?.styleContext || settingsToStyleContext(settings)).customSections.filter((title) => !existing.has(title)).map((title, index): DocumentSection => ({ id: `custom-${index}`, title, content: "추가 정보 필요" }));
    return [...base, ...custom];
  }, [result, resultInput, settings]);

  function update<K extends keyof ReportForm>(key: K, value: ReportForm[K]) { setForm((current) => ({ ...current, [key]: value })); setPrivacyConfirmed(false); }
  async function importReport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const { eventReportInputSchema } = await import("@/lib/schemas");
      const parsed = JSON.parse(await file.text()) as { input?: unknown; resultInput?: unknown; result?: unknown; mode?: unknown; document?: unknown };
      const checked = eventReportInputSchema.safeParse(parsed.input || parsed);
      if (!checked.success) throw new Error("이 결과 보고 JSON의 입력 항목을 확인해 주세요.");
      const checkedResult = parsed.result === undefined ? null : parseEventReportResult(parsed.result);
      if (parsed.result !== undefined && !checkedResult) throw new Error("이 결과 보고 JSON의 생성 결과를 확인해 주세요.");
      const checkedResultInput = parsed.resultInput === undefined ? null : eventReportInputSchema.safeParse(parsed.resultInput);
      if (checkedResultInput && !checkedResultInput.success) throw new Error("이 결과 보고 JSON의 생성 당시 입력을 확인해 주세요.");
      const { styleContext: _styleContext, ...restored } = checked.data; void _styleContext;
      setForm({ ...initialForm, ...restored });
      setResult(checkedResult);
      setResultInput(checkedResult ? (checkedResultInput?.success ? checkedResultInput.data : checked.data) : null);
      setMode(parsed.mode === "demo" ? "demo" : "live");
      setDocumentState(parseEditableDocumentState(parsed.document));
      setDocumentRevision((value) => value + 1);
      setPrivacyConfirmed(false);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "JSON 파일을 불러오지 못했습니다."); }
    event.target.value = "";
  }

  return (
    <div>
      <div className="mb-5 flex overflow-x-auto"><StepIndicator current={step} /></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] lg:items-start">
        <form onSubmit={submit} className="grid gap-5">
          <PrivacyNotice compact />
          {loadedBasics && <div className="rounded-2xl border border-[#bdd4c7] bg-[var(--sage-soft)] p-4 text-sm font-semibold text-[var(--sage-dark)]">행사 계획서에서 기본 정보를 불러왔습니다. 실제 운영 내용에 맞게 확인해 주세요.</div>}
          <FormSection title="행사는 어떻게 진행됐나요?" description="계획과 비교할 필요 없이 실제로 있었던 일을 한 번에 적어 주세요.">
            <Field label="행사 결과 메모" htmlFor="actual-activities" required hint={`${form.actualActivities.length.toLocaleString()} / 10,000자`}><TextArea id="actual-activities" value={form.actualActivities} onChange={(event) => update("actualActivities", event.target.value)} required maxLength={10000} className="min-h-56" placeholder="예: 비가 와서 강당에서 투호와 제기차기를 순환 운영했다. 일부 유아가 투호에 다시 참여했고 친구에게 던지는 위치를 알려 주었다. 안전사고는 없었다." /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="행사명 (선택)" htmlFor="report-event-name"><TextInput id="report-event-name" value={form.eventName} onChange={(event) => update("eventName", event.target.value)} placeholder="비우면 확인 필요로 표시" /></Field>
              <Field label="일시 (선택)" htmlFor="actual-datetime"><TextInput id="actual-datetime" value={form.actualDateTime} onChange={(event) => update("actualDateTime", event.target.value)} /></Field>
              <Field label="장소 (선택)" htmlFor="actual-place"><TextInput id="actual-place" value={form.actualPlace} onChange={(event) => update("actualPlace", event.target.value)} /></Field>
              <Field label="참여 인원 (선택)" htmlFor="actual-participants"><TextInput id="actual-participants" value={form.actualParticipants} onChange={(event) => update("actualParticipants", event.target.value)} /></Field>
            </div>
          </FormSection>
          <details className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <summary className="cursor-pointer font-black text-[var(--sage-dark)]">담당자·유아 반응·안전 메모 더 입력하기</summary>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">결과 메모에 이미 적은 내용은 다시 입력하지 않아도 됩니다.</p>
            <div className="mt-5 grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="대상" htmlFor="report-target"><TextInput id="report-target" value={form.target} onChange={(event) => update("target", event.target.value)} /></Field>
                <Field label="담당자" htmlFor="actual-person"><TextInput id="actual-person" value={form.actualPersonInCharge} onChange={(event) => update("actualPersonInCharge", event.target.value)} /></Field>
                <Field label="날씨·운영 조건" htmlFor="conditions"><TextArea id="conditions" value={form.conditions} onChange={(event) => update("conditions", event.target.value)} className="min-h-24" /></Field>
                <Field label="운영 상태" htmlFor="cancel-status"><SelectInput id="cancel-status" value={form.cancellationStatus} onChange={(event) => update("cancellationStatus", event.target.value)}><option>운영</option><option>일부 변경</option><option>연기</option><option>취소</option></SelectInput></Field>
              </div>
              <Field label="실제 진행 순서" htmlFor="sequence"><TextArea id="sequence" value={form.sequence} onChange={(event) => update("sequence", event.target.value)} /></Field>
              <Field label="유아의 구체적인 행동" htmlFor="behaviors"><TextArea id="behaviors" value={form.childBehaviors} onChange={(event) => update("childBehaviors", event.target.value)} /></Field>
              <Field label="직접 들은 말" htmlFor="child-quotes"><TextArea id="child-quotes" value={form.childQuotes} onChange={(event) => update("childQuotes", event.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="반복 참여한 활동" htmlFor="repeated"><TextArea id="repeated" value={form.repeatedActivities} onChange={(event) => update("repeatedActivities", event.target.value)} /></Field>
                <Field label="어려워한 점" htmlFor="difficulties"><TextArea id="difficulties" value={form.difficulties} onChange={(event) => update("difficulties", event.target.value)} /></Field>
              </div>
              <Field label="교사가 추가로 지원한 내용" htmlFor="teacher-support"><TextArea id="teacher-support" value={form.teacherSupport} onChange={(event) => update("teacherSupport", event.target.value)} /></Field>
              {abstractWarning && <p className="rounded-xl bg-[var(--sun-soft)] p-4 text-sm font-semibold text-[#704b18]" role="status">어떤 행동이나 말에서 관심을 확인했나요? 같은 활동에 다시 참여함, 친구에게 설명함 같은 구체적인 근거를 더해 주세요.</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="안전사고와 특이사항" htmlFor="incidents"><TextArea id="incidents" value={form.safetyIncidents} onChange={(event) => update("safetyIncidents", event.target.value)} /></Field>
                <Field label="안전 운영 메모" htmlFor="safety-reflection"><TextArea id="safety-reflection" value={form.safetyReflection} onChange={(event) => update("safetyReflection", event.target.value)} /></Field>
              </div>
              <Field label="첨부·증빙자료" htmlFor="evidence-docs"><TextArea id="evidence-docs" value={form.evidenceDocuments} onChange={(event) => update("evidenceDocuments", event.target.value)} placeholder="예: 행사 사진, 참여 인원 확인표" /></Field>
              <Field label="잘된 점" htmlFor="strengths"><TextArea id="strengths" value={form.strengths} onChange={(event) => update("strengths", event.target.value)} /></Field>
              <Field label="아쉬운 점" htmlFor="regrets"><TextArea id="regrets" value={form.regrets} onChange={(event) => update("regrets", event.target.value)} /></Field>
              <Field label="다음에 참고할 점" htmlFor="next-changes"><TextArea id="next-changes" value={form.nextChanges} onChange={(event) => update("nextChanges", event.target.value)} /></Field>
              <Field label="다른 연령·학급 적용 시 고려" htmlFor="adaptation"><TextArea id="adaptation" value={form.adaptationNotes} onChange={(event) => update("adaptationNotes", event.target.value)} /></Field>
            </div>
          </details>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm leading-6"><input type="checkbox" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} className="mt-1 size-4 accent-[var(--sage)]" /><span>민감정보가 없으며, 실제 운영 메모에 없는 사실이나 성과가 추가되지 않았는지 검토하겠습니다.</span></label>
          <div className="no-print flex flex-wrap gap-3"><button disabled={loading} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--sage-dark)] px-6 text-lg font-black text-white disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />} {loading ? "행사 결과 메모를 보고서로 정리하고 있습니다…" : "결과 보고서 초안 만들기"}</button>{loading && <button type="button" onClick={() => controller.current?.abort()} className="action-button">취소</button>}<button type="button" onClick={() => { setForm((current) => ({ ...current, ...sampleActual })); setPrivacyConfirmed(false); }} className="action-button">실제 운영 샘플</button></div>
          <div className="no-print flex flex-wrap gap-2"><button type="button" onClick={() => downloadJson({ input, resultInput, result, mode, document: documentState }, `${form.eventName || "행사"}_결과보고`)} className="action-button">JSON 내보내기</button><label className="action-button cursor-pointer"><FileInput size={17} aria-hidden="true" /> JSON 불러오기<input type="file" accept="application/json,.json" onChange={importReport} className="sr-only" /></label></div>
          {error && <div className="rounded-xl border border-[#e7b3a8] bg-[#fff1ed] p-4 text-sm font-semibold text-[#8b3026]" role="alert">{error}{fallbackAvailable && <button type="button" onClick={() => { setResult(demoEventReportResult); setMode("demo"); setResultInput(input); setDocumentState(null); setDocumentRevision((value) => value + 1); setError(""); }} className="ml-3 underline">시연용 샘플 불러오기</button>}</div>}
          <DraftManager kind="event-report" suggestedName={form.eventName || "행사 결과 보고"} data={draftData} onLoad={(value) => { const restored = value as { form: Partial<ReportForm>; result: unknown; mode: GenerationMode; resultInput?: EventReportInput | null; document?: unknown }; const restoredForm = { ...initialForm, ...restored.form }; const restoredResult = parseEventReportResult(restored.result); setForm(restoredForm); setResult(restoredResult); setMode(restored.mode); setResultInput(restored.resultInput || (restoredResult ? { ...restoredForm, styleContext: settingsToStyleContext(settings) } : null)); setDocumentState(parseEditableDocumentState(restored.document)); setDocumentRevision((revision) => revision + 1); setPrivacyConfirmed(false); }} />
        </form>
        <div className="lg:sticky lg:top-5">{result ? <EditableDocument key={`document-${documentRevision}`} title={resultInput?.styleContext.customTitle || result.documentTitle} sections={sections} mode={mode} prefix="결과보고" initialDocument={documentState} onDocumentChange={setDocumentState} /> : <div className="grid min-h-[32rem] place-items-center rounded-[2rem] border border-dashed border-[#b8c8be] bg-[rgba(255,253,248,0.7)] p-8 text-center"><div><Sparkles className="mx-auto text-[var(--sage)]" size={34} aria-hidden="true" /><h2 className="mt-4 text-xl font-black">행사 결과 메모를 적어 주세요</h2><p className="mt-2 max-w-sm leading-7 text-[var(--muted)]">실제로 진행한 활동과 유아 반응을 한 번에 적으면 보고서와 사진 기록 자리를 함께 만듭니다.</p></div></div>}</div>
      </div>
    </div>
  );
}
