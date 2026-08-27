"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileInput, LoaderCircle, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { DraftManager } from "@/components/draft-manager";
import { EditableDocument } from "@/components/editable-document";
import { Field, FormSection, SelectInput, TextArea, TextInput } from "@/components/form-controls";
import { PrivacyNotice } from "@/components/privacy-notice";
import { StepIndicator } from "@/components/step-indicator";
import { postGeneration, type GenerationMode } from "@/lib/api-client";
import { calculateBudgetAmount, calculateBudgetTotal, formatWon } from "@/lib/budget";
import { incrementRequestStat, writeStorage } from "@/lib/client-storage";
import { approvalSections, eventPlanSections, parseEditableDocumentState, type DocumentSection, type EditableDocumentState } from "@/lib/document-sections";
import { demoEventPlanResult } from "@/lib/demo-data";
import { downloadDocx, downloadJson, downloadMarkdown, sectionsToMarkdown } from "@/lib/export-document";
import type { BudgetItemInput, EventPlanInput, EventPlanResult } from "@/lib/schemas";
import { settingsToStyleContext, useAppSettings } from "@/hooks/use-app-settings";
import { useAutoDraft } from "@/hooks/use-auto-draft";

type PlanForm = Omit<EventPlanInput, "styleContext">;

const emptyBudget = (): BudgetItemInput => ({ id: crypto.randomUUID(), item: "", quantity: null, unitPrice: null, budgetCategory: "", vendor: "", note: "" });
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
  const total = calculateBudgetTotal(form.budgetItems);
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
  function updateBudget(id: string, key: keyof BudgetItemInput, value: string) {
    setForm((current) => ({ ...current, budgetItems: current.budgetItems.map((item) => item.id === id ? { ...item, [key]: key === "quantity" || key === "unitPrice" ? (value === "" ? null : Number(value)) : value } : item) }));
    setPrivacyConfirmed(false);
  }

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

  async function exportApproval(format: "md" | "docx") {
    if (!result) return;
    const sourceInput = resultInput || input;
    const approval = approvalSections(sourceInput, result);
    if (format === "md") downloadMarkdown(`${sourceInput.eventName} 품의서 초안`, approval, "품의서초안");
    else await downloadDocx(`${sourceInput.eventName} 품의서 초안`, approval, "품의서초안");
  }

  return (
    <div>
      <div className="mb-5 flex overflow-x-auto"><StepIndicator current={step} /></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] lg:items-start">
        <form onSubmit={submit} className="grid gap-5">
          <PrivacyNotice compact />
          <FormSection title="행사 기본 정보">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="행사명" htmlFor="event-name" required><TextInput id="event-name" value={form.eventName} onChange={(event) => update("eventName", event.target.value)} required maxLength={150} /></Field>
              <Field label="행사 종류" htmlFor="event-type" required><SelectInput id="event-type" value={form.eventType} onChange={(event) => update("eventType", event.target.value)}>{["계절 행사", "전통놀이 행사", "현장체험학습", "학부모 참여수업", "가족 참여 행사", "안전교육", "생태·숲 체험", "입학·수료·졸업 행사", "원내 특별활동", "기타"].map((value) => <option key={value}>{value}</option>)}</SelectInput></Field>
              <Field label="대상" htmlFor="target" required><TextInput id="target" value={form.target} onChange={(event) => update("target", event.target.value)} required /></Field>
              <Field label="예정 날짜" htmlFor="planned-date"><TextInput id="planned-date" type="date" value={form.plannedDate} onChange={(event) => update("plannedDate", event.target.value)} /></Field>
              <Field label="예정 시간" htmlFor="planned-time"><TextInput id="planned-time" value={form.plannedTime} onChange={(event) => update("plannedTime", event.target.value)} placeholder="예: 09:30~11:30" /></Field>
              <Field label="장소" htmlFor="event-place"><TextInput id="event-place" value={form.place} onChange={(event) => update("place", event.target.value)} /></Field>
              <Field label="예상 참여 인원" htmlFor="participants"><TextInput id="participants" value={form.expectedParticipants} onChange={(event) => update("expectedParticipants", event.target.value)} /></Field>
              <Field label="담당자" htmlFor="person"><TextInput id="person" value={form.personInCharge} onChange={(event) => update("personInCharge", event.target.value)} placeholder="비우면 담당자 확인 필요" /></Field>
              <Field label="협조 인력" htmlFor="support-staff"><TextInput id="support-staff" value={form.supportStaff} onChange={(event) => update("supportStaff", event.target.value)} /></Field>
            </div>
          </FormSection>
          <FormSection title="행사 목적과 기대">
            <Field label="왜 하는 행사인가요?" htmlFor="purpose"><TextArea id="purpose" value={form.purpose} onChange={(event) => update("purpose", event.target.value)} /></Field>
            <Field label="유아가 어떤 경험을 하길 바라나요?" htmlFor="experience"><TextArea id="experience" value={form.childExperience} onChange={(event) => update("childExperience", event.target.value)} /></Field>
            <Field label="교육과정·놀이 연결" htmlFor="curriculum"><TextArea id="curriculum" value={form.curriculumLink} onChange={(event) => update("curriculumLink", event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="학부모 참여" htmlFor="parent-participation"><TextArea id="parent-participation" value={form.parentParticipation} onChange={(event) => update("parentParticipation", event.target.value)} className="min-h-24" /></Field><Field label="기대하는 후속 활동" htmlFor="followup"><TextArea id="followup" value={form.expectedFollowUp} onChange={(event) => update("expectedFollowUp", event.target.value)} className="min-h-24" /></Field></div>
          </FormSection>
          <FormSection title="운영 조건">
            <div className="grid gap-4 sm:grid-cols-2">
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
          </FormSection>
          <FormSection title="세부 활동 아이디어">
            <Field label="자유 메모" htmlFor="activity-ideas" required hint={`${form.activityIdeas.length.toLocaleString()} / 8,000자`}><TextArea id="activity-ideas" value={form.activityIdeas} onChange={(event) => update("activityIdeas", event.target.value)} required maxLength={8000} className="min-h-40" /></Field>
          </FormSection>
          <FormSection title="예산 입력" description="금액과 예산 과목은 AI가 만들지 않습니다. 수량×단가와 합계는 이 화면에서 계산합니다.">
            <div className="grid gap-3">
              {form.budgetItems.map((item, index) => <div key={item.id} className="rounded-xl border border-[var(--line)] bg-white p-4"><div className="flex items-center justify-between"><strong>품목 {index + 1}</strong><button type="button" onClick={() => update("budgetItems", form.budgetItems.filter((candidate) => candidate.id !== item.id))} className="grid size-11 place-items-center rounded-lg text-[#a0382d] hover:bg-[#fae8e2]" aria-label={`품목 ${index + 1} 삭제`}><Trash2 size={17} aria-hidden="true" /></button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="품목" htmlFor={`item-${item.id}`}><TextInput id={`item-${item.id}`} value={item.item} onChange={(event) => updateBudget(item.id, "item", event.target.value)} /></Field><Field label="예산 과목" htmlFor={`category-${item.id}`}><TextInput id={`category-${item.id}`} value={item.budgetCategory} onChange={(event) => updateBudget(item.id, "budgetCategory", event.target.value)} placeholder="비우면 담당자 확인 필요" /></Field><Field label="수량" htmlFor={`quantity-${item.id}`}><TextInput id={`quantity-${item.id}`} type="number" min="0" step="any" value={item.quantity ?? ""} onChange={(event) => updateBudget(item.id, "quantity", event.target.value)} /></Field><Field label="단가" htmlFor={`price-${item.id}`}><TextInput id={`price-${item.id}`} type="number" min="0" step="any" value={item.unitPrice ?? ""} onChange={(event) => updateBudget(item.id, "unitPrice", event.target.value)} /></Field><Field label="구매처" htmlFor={`vendor-${item.id}`}><TextInput id={`vendor-${item.id}`} value={item.vendor} onChange={(event) => updateBudget(item.id, "vendor", event.target.value)} /></Field><Field label="비고" htmlFor={`note-${item.id}`}><TextInput id={`note-${item.id}`} value={item.note} onChange={(event) => updateBudget(item.id, "note", event.target.value)} /></Field></div><p className="mt-3 text-sm font-bold text-[var(--sage-dark)]">계산 금액: {formatWon(calculateBudgetAmount(item))}</p></div>)}
              <button type="button" onClick={() => update("budgetItems", [...form.budgetItems, emptyBudget()])} className="action-button w-fit"><Plus size={17} aria-hidden="true" /> 예산 품목 추가</button>
              <p className="rounded-xl bg-[var(--sage-soft)] p-4 text-right text-lg font-black text-[var(--sage-dark)]">입력 금액 합계: {formatWon(total)}</p>
            </div>
          </FormSection>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm leading-6"><input type="checkbox" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} className="mt-1 size-4 accent-[var(--sage)]" /><span>민감정보가 없음을 확인했고, 날짜·담당자·예산을 기관 자료와 대조하겠습니다.</span></label>
          <div className="no-print flex flex-wrap gap-3"><button disabled={loading} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--sage-dark)] px-6 text-lg font-black text-white disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />} {loading ? "행사 아이디어를 일정과 역할에 맞게 정리하고 있습니다…" : "행사 계획서 초안 만들기"}</button>{loading && <button type="button" onClick={() => controller.current?.abort()} className="action-button">취소</button>}<button type="button" onClick={() => { setForm(sample); setPrivacyConfirmed(false); }} className="action-button">샘플 불러오기</button></div>
          <div className="no-print flex flex-wrap gap-2"><button type="button" onClick={() => downloadJson({ input, resultInput, result, mode, document: documentState }, `${form.eventName || "행사"}_계획서`)} className="action-button"><Send size={17} aria-hidden="true" /> JSON 내보내기</button><label className="action-button cursor-pointer"><FileInput size={17} aria-hidden="true" /> JSON 불러오기<input type="file" accept="application/json,.json" onChange={importPlan} className="sr-only" /></label></div>
          {error && <div className="rounded-xl border border-[#e7b3a8] bg-[#fff1ed] p-4 text-sm font-semibold text-[#8b3026]" role="alert">{error}{fallbackAvailable && <button type="button" onClick={() => { setResult(demoEventPlanResult); setResultInput(input); setMode("demo"); setDocumentState(null); setDocumentRevision((value) => value + 1); setError(""); }} className="ml-3 underline">시연용 샘플 불러오기</button>}</div>}
          <DraftManager kind="event-plan" suggestedName={form.eventName || "행사 계획"} data={draftData} onLoad={(value) => { const restored = value as { form: PlanForm; result: EventPlanResult | null; mode: GenerationMode; resultInput?: EventPlanInput | null; document?: unknown }; setForm(restored.form); setResult(restored.result); setResultInput(restored.resultInput || (restored.result ? { ...restored.form, styleContext: settingsToStyleContext(settings) } : null)); setMode(restored.mode); setDocumentState(parseEditableDocumentState(restored.document)); setDocumentRevision((revision) => revision + 1); setPrivacyConfirmed(false); }} />
        </form>

        <div className="lg:sticky lg:top-5">
          {result ? <EditableDocument key={`document-${documentRevision}`} title={resultInput?.styleContext.customTitle || result.documentTitle} sections={sections} mode={mode} prefix="행사계획" initialDocument={documentState} onDocumentChange={setDocumentState} extraActions={<><button type="button" onClick={moveToReport} className="action-button bg-[var(--sage-dark)] text-white hover:text-[var(--sage-dark)]">이 계획으로 결과 보고 작성</button><button type="button" onClick={moveToNotice} className="action-button">가정통신문 초안</button><button type="button" onClick={() => exportApproval("md")} className="action-button">품의서 MD</button><button type="button" onClick={() => exportApproval("docx")} className="action-button">품의서 DOCX</button></>} /> : <div className="grid min-h-[32rem] place-items-center rounded-[2rem] border border-dashed border-[#b8c8be] bg-[rgba(255,253,248,0.7)] p-8 text-center"><div><Sparkles className="mx-auto text-[var(--sage)]" size={34} aria-hidden="true" /><h2 className="mt-4 text-xl font-black">행사 아이디어를 입력해 주세요</h2><p className="mt-2 max-w-sm leading-7 text-[var(--muted)]">입력하지 않은 날짜·담당자·금액은 만들지 않고 확인 필요로 표시합니다.</p></div></div>}
        </div>
      </div>
    </div>
  );
}
