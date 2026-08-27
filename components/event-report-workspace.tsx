"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FileInput, LoaderCircle, Sparkles } from "lucide-react";
import { DraftManager } from "@/components/draft-manager";
import { EditableDocument } from "@/components/editable-document";
import { Field, FormSection, SelectInput, TextArea, TextInput } from "@/components/form-controls";
import { PrivacyNotice } from "@/components/privacy-notice";
import { StepIndicator } from "@/components/step-indicator";
import { postGeneration, type GenerationMode } from "@/lib/api-client";
import { calculateBudgetTotal, formatWon } from "@/lib/budget";
import { incrementRequestStat, readStorage, removeStorage } from "@/lib/client-storage";
import { eventReportSections, parseEditableDocumentState, type DocumentSection, type EditableDocumentState } from "@/lib/document-sections";
import { demoEventReportResult } from "@/lib/demo-data";
import { downloadDocx, downloadJson, downloadMarkdown, sectionsToMarkdown } from "@/lib/export-document";
import { needsConcreteEvidence } from "@/lib/privacy";
import type { EventPlanInput, EventPlanResult, EventReportInput, EventReportResult } from "@/lib/schemas";
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

type Transfer = { input: EventPlanInput; result: EventPlanResult; document?: unknown };

export function EventReportWorkspace() {
  const settings = useAppSettings();
  const [form, setForm] = useState<ReportForm>(initialForm);
  const [result, setResult] = useState<EventReportResult | null>(null);
  const [mode, setMode] = useState<GenerationMode>("live");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallbackAvailable, setFallbackAvailable] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [loadedPlan, setLoadedPlan] = useState(false);
  const [resultInput, setResultInput] = useState<EventReportInput | null>(null);
  const [documentState, setDocumentState] = useState<EditableDocumentState | null>(null);
  const [documentRevision, setDocumentRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);

  function applyTransfer(transfer: Transfer) {
    const { input, result: plan } = transfer;
    const transferredDocument = parseEditableDocumentState(transfer.document);
    setForm((current) => ({ ...current,
      eventName: input.eventName, target: input.target, planSource: (transferredDocument ? sectionsToMarkdown(plan.documentTitle, transferredDocument.sections) : JSON.stringify({ input, result: plan })).slice(0, 15000), planObjectives: plan.objectives.join("\n"), plannedDateTime: plan.overview.dateTime,
      plannedPlace: plan.overview.place, plannedParticipants: plan.overview.expectedParticipants, plannedActivities: plan.program.map((item) => `${item.activity}: ${item.details}`).join("\n"), plannedRoles: plan.roles.map((item) => `${item.role}: ${item.personInCharge}`).join("\n"),
      plannedMaterials: [...plan.materials.available, ...plan.materials.toPrepare, ...plan.materials.consumables].join("\n"), plannedSafety: plan.safetyPlan.map((item) => `${item.risk}: ${item.prevention}`).join("\n"), plannedBudgetTotal: calculateBudgetTotal(input.budgetItems),
    }));
    setLoadedPlan(true);
  }

  useEffect(() => {
    const transfer = readStorage<Transfer | null>("event-report-transfer", null);
    if (!transfer?.input || !transfer?.result) return;
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
    const base = eventReportSections(result, resultInput || undefined);
    const existing = new Set(base.map((section) => section.title));
    const custom = (resultInput?.styleContext || settingsToStyleContext(settings)).customSections.filter((title) => !existing.has(title)).map((title, index): DocumentSection => ({ id: `custom-${index}`, title, content: "추가 정보 필요" }));
    return [...base, ...custom];
  }, [result, resultInput, settings]);

  function update<K extends keyof ReportForm>(key: K, value: ReportForm[K]) { setForm((current) => ({ ...current, [key]: value })); setPrivacyConfirmed(false); }
  async function importReport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const { eventReportInputSchema, eventReportResultSchema } = await import("@/lib/schemas");
      const parsed = JSON.parse(await file.text()) as { input?: unknown; resultInput?: unknown; result?: unknown; mode?: unknown; document?: unknown };
      const checked = eventReportInputSchema.safeParse(parsed.input || parsed);
      if (!checked.success) throw new Error("이 결과 보고 JSON의 입력 항목을 확인해 주세요.");
      const checkedResult = parsed.result === undefined ? null : eventReportResultSchema.safeParse(parsed.result);
      if (checkedResult && !checkedResult.success) throw new Error("이 결과 보고 JSON의 생성 결과를 확인해 주세요.");
      const checkedResultInput = parsed.resultInput === undefined ? null : eventReportInputSchema.safeParse(parsed.resultInput);
      if (checkedResultInput && !checkedResultInput.success) throw new Error("이 결과 보고 JSON의 생성 당시 입력을 확인해 주세요.");
      const { styleContext: _styleContext, ...restored } = checked.data; void _styleContext;
      setForm(restored);
      setResult(checkedResult?.success ? checkedResult.data : null);
      setResultInput(checkedResult?.success ? (checkedResultInput?.success ? checkedResultInput.data : checked.data) : null);
      setMode(parsed.mode === "demo" ? "demo" : "live");
      setDocumentState(parseEditableDocumentState(parsed.document));
      setDocumentRevision((value) => value + 1);
      setPrivacyConfirmed(false);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "JSON 파일을 불러오지 못했습니다."); }
    event.target.value = "";
  }

  async function exportSettlement(format: "md" | "docx") {
    const sourceInput = resultInput || input;
    const difference = sourceInput.plannedBudgetTotal !== null && sourceInput.actualBudgetTotal !== null ? sourceInput.actualBudgetTotal - sourceInput.plannedBudgetTotal : null;
    const settlement: DocumentSection[] = [
      { id: "summary", title: "정산 개요", content: `- 행사명: ${sourceInput.eventName}\n- 계획 금액: ${formatWon(sourceInput.plannedBudgetTotal)}\n- 실제 집행액: ${formatWon(sourceInput.actualBudgetTotal)}\n- 차액: ${difference === null ? "확인 필요" : formatWon(difference)}` },
      { id: "reason", title: "차이 발생 이유", content: sourceInput.budgetReason || "추가 정보 필요" },
      { id: "evidence", title: "증빙자료", content: sourceInput.evidenceDocuments || "추가 정보 필요" },
      { id: "check", title: "정산 전 확인", content: "- [ ] 예산 과목 대조\n- [ ] 영수증·증빙 대조\n- [ ] 실제 집행액 재확인\n- [ ] 기관 정산 양식 확인" },
    ];
    if (format === "md") downloadMarkdown(`${sourceInput.eventName} 정산표 초안`, settlement, "정산표초안"); else await downloadDocx(`${sourceInput.eventName} 정산표 초안`, settlement, "정산표초안");
  }

  return (
    <div>
      <div className="mb-5 flex overflow-x-auto"><StepIndicator current={step} /></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] lg:items-start">
        <form onSubmit={submit} className="grid gap-5">
          <PrivacyNotice compact />
          {loadedPlan && <div className="rounded-2xl border border-[#bdd4c7] bg-[var(--sage-soft)] p-4 text-sm font-semibold text-[var(--sage-dark)]">저장된 계획서의 행사명·목표·일정·역할·준비물·안전·예산 계획을 불러왔습니다. 계획은 실제 결과로 간주하지 않습니다.</div>}
          <FormSection title="계획서 가져오기" description="저장된 계획이 없으면 기존 계획서 원문을 붙여넣을 수 있습니다. 원문과 구조화 결과는 구분해 보관합니다.">
            <Field label="행사명" htmlFor="report-event-name" required><TextInput id="report-event-name" value={form.eventName} onChange={(event) => update("eventName", event.target.value)} required /></Field>
            <Field label="대상" htmlFor="report-target"><TextInput id="report-target" value={form.target} onChange={(event) => update("target", event.target.value)} /></Field>
            <Field label="기존 계획서 원문" htmlFor="plan-source" hint={`${form.planSource.length.toLocaleString()} / 15,000자`}><TextArea id="plan-source" value={form.planSource} onChange={(event) => update("planSource", event.target.value)} maxLength={15000} className="min-h-40" /></Field>
            <Field label="계획 목표" htmlFor="plan-objectives"><TextArea id="plan-objectives" value={form.planObjectives} onChange={(event) => update("planObjectives", event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="계획 일시" htmlFor="planned-datetime"><TextInput id="planned-datetime" value={form.plannedDateTime} onChange={(event) => update("plannedDateTime", event.target.value)} /></Field><Field label="계획 장소" htmlFor="planned-place"><TextInput id="planned-place" value={form.plannedPlace} onChange={(event) => update("plannedPlace", event.target.value)} /></Field><Field label="계획 참여 인원" htmlFor="planned-participants"><TextInput id="planned-participants" value={form.plannedParticipants} onChange={(event) => update("plannedParticipants", event.target.value)} /></Field><Field label="계획 예산 합계" htmlFor="planned-budget"><TextInput id="planned-budget" type="number" min="0" value={form.plannedBudgetTotal ?? ""} onChange={(event) => update("plannedBudgetTotal", event.target.value === "" ? null : Number(event.target.value))} /></Field></div>
            <Field label="계획 활동" htmlFor="planned-activities"><TextArea id="planned-activities" value={form.plannedActivities} onChange={(event) => update("plannedActivities", event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="계획 역할" htmlFor="planned-roles"><TextArea id="planned-roles" value={form.plannedRoles} onChange={(event) => update("plannedRoles", event.target.value)} /></Field><Field label="계획 준비물" htmlFor="planned-materials"><TextArea id="planned-materials" value={form.plannedMaterials} onChange={(event) => update("plannedMaterials", event.target.value)} /></Field></div>
            <Field label="계획 안전 내용" htmlFor="planned-safety"><TextArea id="planned-safety" value={form.plannedSafety} onChange={(event) => update("plannedSafety", event.target.value)} /></Field>
          </FormSection>
          <FormSection title="실제 운영 정보">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="실제 날짜와 시간" htmlFor="actual-datetime"><TextInput id="actual-datetime" value={form.actualDateTime} onChange={(event) => update("actualDateTime", event.target.value)} /></Field><Field label="실제 장소" htmlFor="actual-place"><TextInput id="actual-place" value={form.actualPlace} onChange={(event) => update("actualPlace", event.target.value)} /></Field><Field label="실제 참여 인원" htmlFor="actual-participants"><TextInput id="actual-participants" value={form.actualParticipants} onChange={(event) => update("actualParticipants", event.target.value)} /></Field><Field label="실제 담당자" htmlFor="actual-person"><TextInput id="actual-person" value={form.actualPersonInCharge} onChange={(event) => update("actualPersonInCharge", event.target.value)} /></Field><Field label="날씨·운영 조건" htmlFor="conditions"><TextArea id="conditions" value={form.conditions} onChange={(event) => update("conditions", event.target.value)} className="min-h-24" /></Field><Field label="취소·연기 여부" htmlFor="cancel-status"><SelectInput id="cancel-status" value={form.cancellationStatus} onChange={(event) => update("cancellationStatus", event.target.value)}><option>운영</option><option>일부 변경</option><option>연기</option><option>취소</option></SelectInput></Field></div>
          </FormSection>
          <FormSection title="실제 진행 내용">
            <Field label="실제로 진행한 활동" htmlFor="actual-activities" required hint="계획서만으로 결과를 만들지 않도록 실제 운영 사실을 적어 주세요."><TextArea id="actual-activities" value={form.actualActivities} onChange={(event) => update("actualActivities", event.target.value)} required className="min-h-40" /></Field>
            <Field label="실제 진행 순서" htmlFor="sequence"><TextArea id="sequence" value={form.sequence} onChange={(event) => update("sequence", event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="계획에서 바뀐 내용" htmlFor="changes"><TextArea id="changes" value={form.changes} onChange={(event) => update("changes", event.target.value)} /></Field><Field label="바뀐 이유" htmlFor="change-reasons"><TextArea id="change-reasons" value={form.changeReasons} onChange={(event) => update("changeReasons", event.target.value)} /></Field><Field label="생략한 활동" htmlFor="omitted"><TextArea id="omitted" value={form.omittedActivities} onChange={(event) => update("omittedActivities", event.target.value)} /></Field><Field label="추가한 활동" htmlFor="added"><TextArea id="added" value={form.addedActivities} onChange={(event) => update("addedActivities", event.target.value)} /></Field></div>
          </FormSection>
          <FormSection title="유아 반응과 관찰 근거" description="“아이들이 좋아했음”도 좋지만, 어떤 행동이나 말을 보았는지 한 장면만 더 적어 주세요.">
            <Field label="구체적인 행동" htmlFor="behaviors"><TextArea id="behaviors" value={form.childBehaviors} onChange={(event) => update("childBehaviors", event.target.value)} /></Field>
            <Field label="직접 들은 말" htmlFor="child-quotes"><TextArea id="child-quotes" value={form.childQuotes} onChange={(event) => update("childQuotes", event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="반복 참여한 활동" htmlFor="repeated"><TextArea id="repeated" value={form.repeatedActivities} onChange={(event) => update("repeatedActivities", event.target.value)} /></Field><Field label="어려워한 점" htmlFor="difficulties"><TextArea id="difficulties" value={form.difficulties} onChange={(event) => update("difficulties", event.target.value)} /></Field></div>
            <Field label="교사가 추가로 지원한 내용" htmlFor="teacher-support"><TextArea id="teacher-support" value={form.teacherSupport} onChange={(event) => update("teacherSupport", event.target.value)} /></Field>
            {abstractWarning && <p className="rounded-xl bg-[var(--sun-soft)] p-4 text-sm font-semibold text-[#704b18]" role="status">어떤 행동이나 말에서 관심을 확인했나요? 같은 활동에 다시 참여함, 친구에게 설명함 같은 구체적인 근거를 더해 주세요.</p>}
          </FormSection>
          <FormSection title="안전·예산·교사 성찰">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="안전사고와 특이사항" htmlFor="incidents"><TextArea id="incidents" value={form.safetyIncidents} onChange={(event) => update("safetyIncidents", event.target.value)} /></Field><Field label="안전 운영 성찰" htmlFor="safety-reflection"><TextArea id="safety-reflection" value={form.safetyReflection} onChange={(event) => update("safetyReflection", event.target.value)} /></Field><Field label="실제 집행액" htmlFor="actual-budget"><TextInput id="actual-budget" type="number" min="0" value={form.actualBudgetTotal ?? ""} onChange={(event) => update("actualBudgetTotal", event.target.value === "" ? null : Number(event.target.value))} /></Field><Field label="차이 발생 이유" htmlFor="budget-reason"><TextArea id="budget-reason" value={form.budgetReason} onChange={(event) => update("budgetReason", event.target.value)} /></Field></div>
            <Field label="증빙자료" htmlFor="evidence-docs"><TextArea id="evidence-docs" value={form.evidenceDocuments} onChange={(event) => update("evidenceDocuments", event.target.value)} /></Field>
            <Field label="잘된 점" htmlFor="strengths"><TextArea id="strengths" value={form.strengths} onChange={(event) => update("strengths", event.target.value)} /></Field>
            <Field label="아쉬운 점" htmlFor="regrets"><TextArea id="regrets" value={form.regrets} onChange={(event) => update("regrets", event.target.value)} /></Field>
            <Field label="다음 행사에서 바꿀 점" htmlFor="next-changes"><TextArea id="next-changes" value={form.nextChanges} onChange={(event) => update("nextChanges", event.target.value)} /></Field>
            <Field label="다른 연령·학급 적용 시 고려" htmlFor="adaptation"><TextArea id="adaptation" value={form.adaptationNotes} onChange={(event) => update("adaptationNotes", event.target.value)} /></Field>
          </FormSection>
          <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white p-4"><h3 className="font-black">생성 전 계획·실제 비교</h3><table className="mt-3 min-w-[600px] w-full text-left text-sm"><thead><tr><th className="p-2">항목</th><th className="p-2">계획</th><th className="p-2">실제</th></tr></thead><tbody>{[["일시", form.plannedDateTime, form.actualDateTime], ["장소", form.plannedPlace, form.actualPlace], ["참여 인원", form.plannedParticipants, form.actualParticipants], ["활동", form.plannedActivities, form.actualActivities]].map((row) => <tr key={row[0]} className="border-t border-[var(--line)]"><th className="p-2">{row[0]}</th><td className="max-w-xs whitespace-pre-wrap p-2">{row[1] || "추가 정보 필요"}</td><td className="max-w-xs whitespace-pre-wrap p-2">{row[2] || "추가 정보 필요"}</td></tr>)}</tbody></table></div>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm leading-6"><input type="checkbox" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} className="mt-1 size-4 accent-[var(--sage)]" /><span>계획과 실제를 구분했고, 민감정보가 없으며 결과와 성과를 근거 자료와 대조하겠습니다.</span></label>
          <div className="no-print flex flex-wrap gap-3"><button disabled={loading} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--sage-dark)] px-6 text-lg font-black text-white disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />} {loading ? "계획과 실제 운영 내용을 비교하고 있습니다…" : "결과 보고서 초안 만들기"}</button>{loading && <button type="button" onClick={() => controller.current?.abort()} className="action-button">취소</button>}<button type="button" onClick={() => { setForm((current) => ({ ...current, ...sampleActual })); setPrivacyConfirmed(false); }} className="action-button">실제 운영 샘플</button></div>
          <div className="no-print flex flex-wrap gap-2"><button type="button" onClick={() => downloadJson({ input, resultInput, result, mode, document: documentState }, `${form.eventName || "행사"}_결과보고`)} className="action-button">JSON 내보내기</button><label className="action-button cursor-pointer"><FileInput size={17} aria-hidden="true" /> JSON 불러오기<input type="file" accept="application/json,.json" onChange={importReport} className="sr-only" /></label></div>
          {error && <div className="rounded-xl border border-[#e7b3a8] bg-[#fff1ed] p-4 text-sm font-semibold text-[#8b3026]" role="alert">{error}{fallbackAvailable && <button type="button" onClick={() => { setResult(demoEventReportResult); setMode("demo"); setResultInput(input); setDocumentState(null); setDocumentRevision((value) => value + 1); setError(""); }} className="ml-3 underline">시연용 샘플 불러오기</button>}</div>}
          <DraftManager kind="event-report" suggestedName={form.eventName || "행사 결과 보고"} data={draftData} onLoad={(value) => { const restored = value as { form: ReportForm; result: EventReportResult | null; mode: GenerationMode; resultInput?: EventReportInput | null; document?: unknown }; setForm(restored.form); setResult(restored.result); setMode(restored.mode); setResultInput(restored.resultInput || (restored.result ? { ...restored.form, styleContext: settingsToStyleContext(settings) } : null)); setDocumentState(parseEditableDocumentState(restored.document)); setDocumentRevision((revision) => revision + 1); setPrivacyConfirmed(false); }} />
        </form>
        <div className="lg:sticky lg:top-5">{result ? <EditableDocument key={`document-${documentRevision}`} title={resultInput?.styleContext.customTitle || result.documentTitle} sections={sections} mode={mode} prefix="결과보고" initialDocument={documentState} onDocumentChange={setDocumentState} extraActions={<><button type="button" onClick={() => exportSettlement("md")} className="action-button">정산표 MD</button><button type="button" onClick={() => exportSettlement("docx")} className="action-button">정산표 DOCX</button></>} /> : <div className="grid min-h-[32rem] place-items-center rounded-[2rem] border border-dashed border-[#b8c8be] bg-[rgba(255,253,248,0.7)] p-8 text-center"><div><Sparkles className="mx-auto text-[var(--sage)]" size={34} aria-hidden="true" /><h2 className="mt-4 text-xl font-black">계획과 실제 운영을 함께 적어 주세요</h2><p className="mt-2 max-w-sm leading-7 text-[var(--muted)]">계획을 실행 결과처럼 바꾸지 않고, 실제 행동과 운영 메모에 근거해 보고서를 만듭니다.</p></div></div>}</div>
      </div>
    </div>
  );
}
