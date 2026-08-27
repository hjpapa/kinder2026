"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileInput, LoaderCircle, Send, Sparkles } from "lucide-react";
import { DraftManager } from "@/components/draft-manager";
import { EditableDocument } from "@/components/editable-document";
import { Field, FormSection, SelectInput, TextArea, TextInput } from "@/components/form-controls";
import { PrivacyNotice } from "@/components/privacy-notice";
import { StepIndicator } from "@/components/step-indicator";
import { postGeneration, type GenerationMode } from "@/lib/api-client";
import { incrementRequestStat, writeStorage } from "@/lib/client-storage";
import { eventPlanSections, parseEditableDocumentState, type DocumentSection, type EditableDocumentState } from "@/lib/document-sections";
import { demoEventPlanResult } from "@/lib/demo-data";
import { downloadJson, sectionsToMarkdown } from "@/lib/export-document";
import type { EventPlanInput, EventPlanResult } from "@/lib/schemas";
import { settingsToStyleContext, useAppSettings } from "@/hooks/use-app-settings";
import { useAutoDraft } from "@/hooks/use-auto-draft";

type PlanForm = Omit<EventPlanInput, "styleContext">;

const initialForm: PlanForm = {
  eventName: "", eventType: "전통놀이 행사", target: "", plannedDate: "", plannedTime: "", place: "", expectedParticipants: "", personInCharge: "", supportStaff: "",
  purpose: "", childExperience: "", curriculumLink: "", parentParticipation: "", expectedFollowUp: "", availableSpaces: "", totalTime: "", preparationTime: "", purchasing: "",
  availableMaterials: "", rainPlan: "", accessibility: "", staffCount: "", mustInclude: "", exclude: "", activityIdeas: "", budgetItems: [],
};
const sample: PlanForm = {
  eventName: "가을 전통놀이 한마당", eventType: "전통놀이 행사", target: "만 3~5세 유아", plannedDate: "2026-09-18", plannedTime: "09:30~11:30", place: "유치원 강당과 바깥놀이터", expectedParticipants: "유아 60명, 교직원 8명", personInCharge: "", supportStaff: "담임교사, 방과후교사",
  purpose: "가을 놀이와 연결해 여러 전통놀이를 경험한다.", childExperience: "경쟁보다 자유롭게 반복해서 참여하고 놀이 방법을 탐색한다.", curriculumLink: "신체운동·건강 및 사회관계 영역과 놀이 중심으로 연결", parentParticipation: "없음", expectedFollowUp: "교실 놀이 영역에서 관심 활동을 이어감",
  availableSpaces: "강당, 바깥놀이터", totalTime: "2시간", preparationTime: "행사 전날 2시간", purchasing: "소모품 일부 구매 가능", availableMaterials: "제기, 투호 통, 비석, 보자기", rainPlan: "강당에서 연령별 순환 운영", accessibility: "이동이 불편하거나 소음에 민감한 유아가 쉬어 갈 공간 마련", staffCount: "8명", mustInclude: "제기차기, 투호, 비석치기, 보자기 매듭", exclude: "승패를 강조하는 시상", activityIdeas: "제기차기, 투호, 비석치기, 보자기 매듭 놀이를 연령별로 순환 운영. 경쟁보다 자유롭게 반복해서 참여하는 방식.",
  budgetItems: [{ id: "sample-1", item: "활동 구역 표시 테이프", quantity: 5, unitPrice: 3000, budgetCategory: "", vendor: "", note: "소모품" }],
};

export function EventPlanWorkspace() {
  const router = useRouter();
  const settings = useAppSettings();
  const [form, setForm] = useState<PlanForm>(initialForm);
  const [result, setResult] = useState<EventPlanResult | null>(null);
  const [mode, setMode] = useState<GenerationMode>("live");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallbackAvailable, setFallbackAvailable] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [resultInput, setResultInput] = useState<EventPlanInput | null>(null);
  const [documentState, setDocumentState] = useState<EditableDocumentState | null>(null);
  const [documentRevision, setDocumentRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const input: EventPlanInput = useMemo(() => ({ ...form, styleContext: settingsToStyleContext(settings) }), [form, settings]);
  const draftData = useMemo(() => ({ form, result, mode, resultInput, document: documentState }), [form, result, mode, resultInput, documentState]);
  useAutoDraft("event-plan", draftData, settings.autoSave);
  const step = loading ? 2 : documentState?.reviewed ? 4 : result ? 3 : 1;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!privacyConfirmed) { setError("개인정보와 교사 검토 확인에 동의해 주세요."); return; }
    controller.current?.abort(); controller.current = new AbortController();
    setLoading(true); setError(""); setFallbackAvailable(false);
    try {
      const generated = await postGeneration<EventPlanResult>("/api/generate/event-plan", input, controller.current.signal);
      setResult(generated.data); setResultInput(input); setMode(generated.mode); setDocumentState(null); setDocumentRevision((value) => value + 1); incrementRequestStat("event-plan");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "초안을 만들지 못했습니다.");
      setFallbackAvailable(Boolean((reason as Error & { fallbackAvailable?: boolean })?.fallbackAvailable));
    } finally { setLoading(false); }
  }

  const sections = useMemo(() => {
    if (!result) return [];
    const base = eventPlanSections(result);
    const existing = new Set(base.map((section) => section.title));
    const custom = (resultInput?.styleContext || settingsToStyleContext(settings)).customSections.filter((title) => !existing.has(title)).map((title, index): DocumentSection => ({ id: `custom-${index}`, title, content: "추가 정보 필요" }));
    return [...base, ...custom];
  }, [result, resultInput, settings]);

  function update<K extends keyof PlanForm>(key: K, value: PlanForm[K]) { setForm((current) => ({ ...current, [key]: value })); setPrivacyConfirmed(false); }

  async function importPlan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const { eventPlanInputSchema, eventPlanResultSchema } = await import("@/lib/schemas");
      const parsed = JSON.parse(await file.text()) as { input?: unknown; resultInput?: unknown; result?: unknown; mode?: unknown; document?: unknown };
      const checked = eventPlanInputSchema.safeParse(parsed.input || parsed);
      if (!checked.success) throw new Error("이 계획서 JSON의 입력 항목을 확인해 주세요.");
      const checkedResult = parsed.result === undefined ? null : eventPlanResultSchema.safeParse(parsed.result);
      if (checkedResult && !checkedResult.success) throw new Error("이 계획서 JSON의 생성 결과를 확인해 주세요.");
      const checkedResultInput = parsed.resultInput === undefined ? null : eventPlanInputSchema.safeParse(parsed.resultInput);
      if (checkedResultInput && !checkedResultInput.success) throw new Error("이 계획서 JSON의 생성 당시 입력을 확인해 주세요.");
      const { styleContext: _styleContext, ...restored } = checked.data;
      void _styleContext;
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

  function moveToReport() {
    if (!result) return;
    const sourceInput = resultInput || input;
    writeStorage("event-report-transfer", { input: sourceInput, result, document: documentState, transferredAt: new Date().toISOString() });
    router.push("/event-report?from=plan");
  }

  function moveToNotice() {
    if (!result) return;
    const sourceInput = resultInput || input;
    writeStorage("parent-notice-transfer", { eventName: sourceInput.eventName, eventSummary: sectionsToMarkdown(result.documentTitle, documentState?.sections || sections), confirmedDetails: `${result.overview.dateTime}\n${result.overview.place}` });
    router.push("/parent-notice?from=plan");
  }

  function moveToFinance() {
    if (!result) return;
    const sourceInput = resultInput || input;
    writeStorage("finance-transfer", {
      subject: [sourceInput.eventName, "행사 품의"].filter(Boolean).join(" "),
      eventName: sourceInput.eventName,
      memo: sourceInput.activityIdeas,
      items: sourceInput.budgetItems,
    });
    router.push("/finance?tab=approval&from=plan");
  }

  return (
    <div>
      <div className="mb-5 flex overflow-x-auto"><StepIndicator current={step} /></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] lg:items-start">
        <form onSubmit={submit} className="grid gap-5">
          <PrivacyNotice compact />
          <FormSection title="어떤 행사를 준비하나요?" description="알고 있는 내용을 한 번에 적어 주세요. 누리는 메모에서 일정, 활동, 준비물과 안전 사항을 나누어 정리합니다.">
            <Field label="행사 메모" htmlFor="activity-ideas" required hint={`${form.activityIdeas.length.toLocaleString()} / 8,000자`}><TextArea id="activity-ideas" value={form.activityIdeas} onChange={(event) => update("activityIdeas", event.target.value)} required maxLength={8000} className="min-h-56" placeholder="예: 9월에 강당에서 전통놀이 행사를 열고 싶어요. 만 3~5세가 투호와 제기차기를 자유롭게 순환하고, 비가 오면 모두 강당에서 운영해요." /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="행사명 (선택)" htmlFor="event-name"><TextInput id="event-name" value={form.eventName} onChange={(event) => update("eventName", event.target.value)} maxLength={150} placeholder="비우면 확인 필요로 표시" /></Field>
              <Field label="예정 날짜 (선택)" htmlFor="planned-date"><TextInput id="planned-date" type="date" value={form.plannedDate} onChange={(event) => update("plannedDate", event.target.value)} /></Field>
              <Field label="대상 (선택)" htmlFor="target"><TextInput id="target" value={form.target} onChange={(event) => update("target", event.target.value)} placeholder="예: 만 3~5세" /></Field>
            </div>
          </FormSection>
          <details className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <summary className="cursor-pointer font-black text-[var(--sage-dark)]">시간·인력·운영 조건 더 입력하기</summary>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">메모에 이미 적은 내용은 다시 입력하지 않아도 됩니다.</p>
            <div className="mt-5 grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="행사 종류" htmlFor="event-type"><SelectInput id="event-type" value={form.eventType} onChange={(event) => update("eventType", event.target.value)}>{["계절 행사", "전통놀이 행사", "현장체험학습", "학부모 참여수업", "가족 참여 행사", "안전교육", "생태·숲 체험", "입학·수료·졸업 행사", "원내 특별활동", "기타"].map((value) => <option key={value}>{value}</option>)}</SelectInput></Field>
                <Field label="예정 시간" htmlFor="planned-time"><TextInput id="planned-time" value={form.plannedTime} onChange={(event) => update("plannedTime", event.target.value)} placeholder="예: 09:30~11:30" /></Field>
                <Field label="장소" htmlFor="event-place"><TextInput id="event-place" value={form.place} onChange={(event) => update("place", event.target.value)} /></Field>
                <Field label="예상 참여 인원" htmlFor="participants"><TextInput id="participants" value={form.expectedParticipants} onChange={(event) => update("expectedParticipants", event.target.value)} /></Field>
                <Field label="담당자" htmlFor="person"><TextInput id="person" value={form.personInCharge} onChange={(event) => update("personInCharge", event.target.value)} placeholder="비우면 담당자 확인 필요" /></Field>
                <Field label="협조 인력" htmlFor="support-staff"><TextInput id="support-staff" value={form.supportStaff} onChange={(event) => update("supportStaff", event.target.value)} /></Field>
              </div>
              <Field label="행사 목적" htmlFor="purpose"><TextArea id="purpose" value={form.purpose} onChange={(event) => update("purpose", event.target.value)} /></Field>
              <Field label="유아가 경험하길 바라는 점" htmlFor="experience"><TextArea id="experience" value={form.childExperience} onChange={(event) => update("childExperience", event.target.value)} /></Field>
              <Field label="교육과정·놀이 연결" htmlFor="curriculum"><TextArea id="curriculum" value={form.curriculumLink} onChange={(event) => update("curriculumLink", event.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="학부모 참여" htmlFor="parent-participation"><TextArea id="parent-participation" value={form.parentParticipation} onChange={(event) => update("parentParticipation", event.target.value)} className="min-h-24" /></Field>
                <Field label="기대하는 후속 활동" htmlFor="followup"><TextArea id="followup" value={form.expectedFollowUp} onChange={(event) => update("expectedFollowUp", event.target.value)} className="min-h-24" /></Field>
                <Field label="사용 공간" htmlFor="spaces"><TextArea id="spaces" value={form.availableSpaces} onChange={(event) => update("availableSpaces", event.target.value)} className="min-h-24" /></Field>
                <Field label="전체 운영 시간" htmlFor="total-time"><TextInput id="total-time" value={form.totalTime} onChange={(event) => update("totalTime", event.target.value)} /></Field>
                <Field label="준비 가능 시간" htmlFor="prep-time"><TextInput id="prep-time" value={form.preparationTime} onChange={(event) => update("preparationTime", event.target.value)} /></Field>
                <Field label="구매 가능 여부" htmlFor="purchasing"><TextInput id="purchasing" value={form.purchasing} onChange={(event) => update("purchasing", event.target.value)} /></Field>
                <Field label="보유 자료" htmlFor="available-materials"><TextArea id="available-materials" value={form.availableMaterials} onChange={(event) => update("availableMaterials", event.target.value)} className="min-h-24" /></Field>
                <Field label="우천 시 대체 공간·방법" htmlFor="rain-plan"><TextArea id="rain-plan" value={form.rainPlan} onChange={(event) => update("rainPlan", event.target.value)} className="min-h-24" /></Field>
                <Field label="이동·감각 지원 고려" htmlFor="accessibility"><TextArea id="accessibility" value={form.accessibility} onChange={(event) => update("accessibility", event.target.value)} className="min-h-24" /></Field>
                <Field label="교직원 수" htmlFor="staff-count"><TextInput id="staff-count" value={form.staffCount} onChange={(event) => update("staffCount", event.target.value)} /></Field>
                <Field label="반드시 포함할 활동" htmlFor="must-include"><TextArea id="must-include" value={form.mustInclude} onChange={(event) => update("mustInclude", event.target.value)} className="min-h-24" /></Field>
                <Field label="제외할 활동" htmlFor="exclude"><TextArea id="exclude" value={form.exclude} onChange={(event) => update("exclude", event.target.value)} className="min-h-24" /></Field>
              </div>
            </div>
          </details>
          <div className="rounded-2xl border border-[#bdd4c7] bg-[var(--sage-soft)] p-4 text-sm leading-6 text-[var(--sage-dark)]"><strong className="block">예산과 품의서는 별도 화면에서 간단히 작성할 수 있어요.</strong><Link href="/finance?tab=approval" className="action-button mt-3 w-fit bg-white">품의·정산으로 이동</Link></div>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm leading-6"><input type="checkbox" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} className="mt-1 size-4 accent-[var(--sage)]" /><span>민감정보가 없음을 확인했고, 날짜·담당자 등 확정 정보를 기관 자료와 대조하겠습니다.</span></label>
          <div className="no-print flex flex-wrap gap-3"><button disabled={loading} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--sage-dark)] px-6 text-lg font-black text-white disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />} {loading ? "행사 아이디어를 일정과 역할에 맞게 정리하고 있습니다…" : "행사 계획서 초안 만들기"}</button>{loading && <button type="button" onClick={() => controller.current?.abort()} className="action-button">취소</button>}<button type="button" onClick={() => { setForm(sample); setPrivacyConfirmed(false); }} className="action-button">샘플 불러오기</button></div>
          <div className="no-print flex flex-wrap gap-2"><button type="button" onClick={() => downloadJson({ input, resultInput, result, mode, document: documentState }, `${form.eventName || "행사"}_계획서`)} className="action-button"><Send size={17} aria-hidden="true" /> JSON 내보내기</button><label className="action-button cursor-pointer"><FileInput size={17} aria-hidden="true" /> JSON 불러오기<input type="file" accept="application/json,.json" onChange={importPlan} className="sr-only" /></label></div>
          {error && <div className="rounded-xl border border-[#e7b3a8] bg-[#fff1ed] p-4 text-sm font-semibold text-[#8b3026]" role="alert">{error}{fallbackAvailable && <button type="button" onClick={() => { setResult(demoEventPlanResult); setResultInput(input); setMode("demo"); setDocumentState(null); setDocumentRevision((value) => value + 1); setError(""); }} className="ml-3 underline">시연용 샘플 불러오기</button>}</div>}
          <DraftManager kind="event-plan" suggestedName={form.eventName || "행사 계획"} data={draftData} onLoad={(value) => { const restored = value as { form: Partial<PlanForm>; result: EventPlanResult | null; mode: GenerationMode; resultInput?: EventPlanInput | null; document?: unknown }; const restoredForm = { ...initialForm, ...restored.form }; setForm(restoredForm); setResult(restored.result); setResultInput(restored.resultInput || (restored.result ? { ...restoredForm, styleContext: settingsToStyleContext(settings) } : null)); setMode(restored.mode); setDocumentState(parseEditableDocumentState(restored.document)); setDocumentRevision((revision) => revision + 1); setPrivacyConfirmed(false); }} />
        </form>

        <div className="lg:sticky lg:top-5">
          {result ? <EditableDocument key={`document-${documentRevision}`} title={resultInput?.styleContext.customTitle || result.documentTitle} sections={sections} mode={mode} prefix="행사계획" initialDocument={documentState} onDocumentChange={setDocumentState} extraActions={<><button type="button" onClick={moveToReport} className="action-button bg-[var(--sage-dark)] text-white hover:text-[var(--sage-dark)]">이 계획으로 결과 보고 작성</button><button type="button" onClick={moveToNotice} className="action-button">가정통신문 초안</button><button type="button" onClick={moveToFinance} className="action-button">품의서 작성으로 이동</button></>} /> : <div className="grid min-h-[32rem] place-items-center rounded-[2rem] border border-dashed border-[#b8c8be] bg-[rgba(255,253,248,0.7)] p-8 text-center"><div><Sparkles className="mx-auto text-[var(--sage)]" size={34} aria-hidden="true" /><h2 className="mt-4 text-xl font-black">행사 메모를 입력해 주세요</h2><p className="mt-2 max-w-sm leading-7 text-[var(--muted)]">아는 내용을 한 번에 적으면 일정·역할·준비물·안전 항목으로 나누어 정리합니다.</p></div></div>}
        </div>
      </div>
    </div>
  );
}
