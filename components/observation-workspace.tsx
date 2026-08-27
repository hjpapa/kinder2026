"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { DraftManager } from "@/components/draft-manager";
import { EditableDocument } from "@/components/editable-document";
import { Field, FormSection, SelectInput, TextArea, TextInput } from "@/components/form-controls";
import { PlaySupportImageGenerator } from "@/components/play-support-image-generator";
import { PrivacyNotice } from "@/components/privacy-notice";
import { StepIndicator } from "@/components/step-indicator";
import { postGeneration, type GenerationMode } from "@/lib/api-client";
import { incrementRequestStat } from "@/lib/client-storage";
import { observationSections, parseEditableDocumentState, type EditableDocumentState } from "@/lib/document-sections";
import { demoObservationResult } from "@/lib/demo-data";
import { anonymizeText, parseNames } from "@/lib/privacy";
import type { ObservationInput, ObservationResult } from "@/lib/schemas";
import { settingsToStyleContext, useAppSettings } from "@/hooks/use-app-settings";
import { useAutoDraft } from "@/hooks/use-auto-draft";

type FormState = Omit<ObservationInput, "styleContext"> & { names: string };
type ResultContext = Pick<ObservationInput, "playName" | "age">;

const initialForm: FormState = { age: "만 5세", observationDate: "", playName: "", place: "", childrenCount: "", memo: "", directQuotes: "", curiosity: "", resultLength: "보통", parentTone: "따뜻하게", names: "" };

const sample: FormState = {
  age: "만 5세", observationDate: "2026-09-18", playName: "가을 택배소", place: "교실", childrenCount: "2명", resultLength: "보통", parentTone: "따뜻하게", names: "",
  memo: "유아 A가 도토리 6개를 종이봉투에 넣고 ‘택배로 보내요.’라고 말했다. 유아 B가 ‘우표 없으면 못 가.’라고 하자 주변의 나뭇잎을 가져와 봉투에 붙였다. 봉투가 찢어지자 두 유아가 테이프를 찾아 함께 붙였다. 교사가 어디로 보내는지 묻자 유아 A가 ‘달로 보내요.’라고 대답했다.",
  directQuotes: "택배로 보내요. / 우표 없으면 못 가. / 달로 보내요.", curiosity: "주소와 표식이 놀이에서 어떻게 이어지는지 궁금함",
};

export function ObservationWorkspace() {
  const settings = useAppSettings();
  const [form, setForm] = useState<FormState>(initialForm);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [result, setResult] = useState<ObservationResult | null>(null);
  const [mode, setMode] = useState<GenerationMode>("live");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallbackAvailable, setFallbackAvailable] = useState(false);
  const [documentState, setDocumentState] = useState<EditableDocumentState | null>(null);
  const [documentRevision, setDocumentRevision] = useState(0);
  const [resultContext, setResultContext] = useState<ResultContext | null>(null);
  const controller = useRef<AbortController | null>(null);

  const anonymized = useMemo(() => {
    const names = parseNames(form.names);
    const results = [] as ReturnType<typeof anonymizeText>[];
    const sanitize = (value: string) => {
      const result = anonymizeText(value, names);
      results.push(result);
      return result.text;
    };
    const styleContext = settingsToStyleContext(settings);
    const input: ObservationInput = {
      age: form.age,
      observationDate: form.observationDate,
      playName: sanitize(form.playName),
      place: sanitize(form.place),
      childrenCount: sanitize(form.childrenCount),
      memo: sanitize(form.memo),
      directQuotes: sanitize(form.directQuotes),
      curiosity: sanitize(form.curiosity),
      resultLength: form.resultLength,
      parentTone: form.parentTone,
      styleContext: {
        institutionTone: sanitize(styleContext.institutionTone),
        customTitle: sanitize(styleContext.customTitle),
        customSections: styleContext.customSections.map(sanitize),
        templateName: sanitize(styleContext.templateName),
        guidelineSources: styleContext.guidelineSources.map((source) => ({ title: sanitize(source.title), content: sanitize(source.content) })),
      },
    };
    return {
      input,
      replacements: [...new Map(results.flatMap((result) => result.replacements).map((item) => [item.original, item])).values()],
      maskedTypes: [...new Set(results.flatMap((result) => result.maskedTypes))],
    };
  }, [form, settings]);

  const sendInput = anonymized.input;
  const safeDraftData = useMemo(() => ({ form: { ...form, names: "", playName: sendInput.playName, place: sendInput.place, childrenCount: sendInput.childrenCount, memo: sendInput.memo, directQuotes: sendInput.directQuotes, curiosity: sendInput.curiosity }, result, mode, document: documentState, resultContext }), [form, sendInput, result, mode, documentState, resultContext]);
  useAutoDraft("observation", safeDraftData, settings.autoSave);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setPrivacyConfirmed(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!privacyConfirmed) { setError("자동 익명화 안내를 확인한 뒤 개인정보 확인에 동의해 주세요."); return; }
    controller.current?.abort();
    controller.current = new AbortController();
    setLoading(true); setError(""); setFallbackAvailable(false);
    try {
      const generated = await postGeneration<ObservationResult>("/api/generate/observation", sendInput, controller.current.signal);
      setResult(generated.data); setMode(generated.mode); setDocumentState(null); setDocumentRevision((value) => value + 1); setResultContext({ playName: sendInput.playName, age: sendInput.age }); incrementRequestStat("observation");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "초안을 만들지 못했습니다.");
      setFallbackAvailable(Boolean((reason as Error & { fallbackAvailable?: boolean })?.fallbackAvailable));
    } finally { setLoading(false); }
  }

  const sections = useMemo(() => result ? observationSections(result) : [], [result]);
  const step = loading ? 2 : documentState?.reviewed ? 4 : result ? 3 : 1;
  return (
    <div>
      <div className="mb-5 flex overflow-x-auto"><StepIndicator current={step} /></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <form onSubmit={submit} className="grid gap-5">
          <PrivacyNotice />
          <FormSection title="관찰한 장면" description="메모 한 번이면 충분합니다. 실제 행동과 들은 말을 편하게 적어 주세요.">
            <Field label="관찰 메모" htmlFor="memo" required hint={`${form.memo.length.toLocaleString()} / 6,000자`}><TextArea id="memo" value={form.memo} onChange={(event) => updateForm("memo", event.target.value)} maxLength={6000} required className="min-h-56" placeholder="예: 도토리를 봉투에 넣으며 ‘택배로 보내요’라고 말했다. 봉투가 찢어지자 친구와 테이프를 찾아 붙였다." /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="연령 (선택)" htmlFor="age"><SelectInput id="age" value={form.age} onChange={(event) => updateForm("age", event.target.value as FormState["age"])}><option>만 3세</option><option>만 4세</option><option>만 5세</option></SelectInput></Field>
              <Field label="관찰 날짜 (선택)" htmlFor="observation-date"><TextInput id="observation-date" type="date" value={form.observationDate} onChange={(event) => updateForm("observationDate", event.target.value)} /></Field>
              <Field label="놀이 이름 (선택)" htmlFor="play-name"><TextInput id="play-name" value={form.playName} onChange={(event) => updateForm("playName", event.target.value)} maxLength={120} placeholder="예: 가을 택배소" /></Field>
            </div>
          </FormSection>
          <details className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <summary className="cursor-pointer font-black text-[var(--sage-dark)]">선택 정보와 익명화 설정</summary>
            <div className="mt-5 grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="놀이 장소" htmlFor="place"><TextInput id="place" value={form.place} onChange={(event) => updateForm("place", event.target.value)} maxLength={300} placeholder="예: 교실" /></Field>
                <Field label="등장 유아 수" htmlFor="children-count"><TextInput id="children-count" value={form.childrenCount} onChange={(event) => updateForm("childrenCount", event.target.value)} maxLength={300} placeholder="예: 2명" /></Field>
              </div>
              <Field label="직접 들은 말" htmlFor="quotes"><TextArea id="quotes" value={form.directQuotes} onChange={(event) => updateForm("directQuotes", event.target.value)} maxLength={4000} placeholder="메모에 함께 적었다면 비워 두어도 됩니다." /></Field>
              <Field label="교사가 더 궁금한 점" htmlFor="curiosity"><TextArea id="curiosity" value={form.curiosity} onChange={(event) => updateForm("curiosity", event.target.value)} maxLength={4000} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="결과 길이" htmlFor="result-length"><SelectInput id="result-length" value={form.resultLength} onChange={(event) => updateForm("resultLength", event.target.value as FormState["resultLength"])}><option>짧게</option><option>보통</option><option>자세히</option></SelectInput></Field>
                <Field label="학부모 문체" htmlFor="parent-tone"><SelectInput id="parent-tone" value={form.parentTone} onChange={(event) => updateForm("parentTone", event.target.value as FormState["parentTone"])}><option>따뜻하게</option><option>담백하게</option></SelectInput></Field>
              </div>
              <Field label="익명화할 실제 이름 목록" htmlFor="names" hint="쉼표나 줄바꿈으로 구분합니다. 이 목록은 저장하거나 서버로 보내지 않습니다."><TextArea id="names" value={form.names} onChange={(event) => updateForm("names", event.target.value)} placeholder="예: 민준, 지우, 서연" className="min-h-20" /></Field>
              <p className="rounded-xl bg-[var(--sage-soft)] p-4 text-sm font-semibold leading-6 text-[var(--sage-dark)]" aria-live="polite">자동 마스킹 요약: 이름 {anonymized.replacements.length}개 치환 · {anonymized.maskedTypes.length ? anonymized.maskedTypes.join(", ") : "추가로 감지된 개인정보 형식 없음"}</p>
            </div>
          </details>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm leading-6"><input type="checkbox" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} className="mt-1 size-4 accent-[var(--sage)]" /><span>개인정보 자동 마스킹을 확인했고, AI 초안을 원문과 비교해 검토하겠습니다.<small className="mt-1 block text-[var(--muted)]">이름 {anonymized.replacements.length}개 치환 · {anonymized.maskedTypes.length ? anonymized.maskedTypes.join(", ") : "추가 마스킹 없음"}</small></span></label>
          <div className="no-print flex flex-wrap gap-3">
            <button disabled={loading} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--sage-dark)] px-6 text-lg font-black text-white disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />} {loading ? "관찰한 장면을 기록 문장으로 정리하고 있습니다…" : "이 내용으로 AI 초안 만들기"}</button>
            {loading && <button type="button" onClick={() => controller.current?.abort()} className="action-button">취소</button>}
            <button type="button" onClick={() => { setForm(sample); setPrivacyConfirmed(false); }} className="action-button">가을 택배소 샘플</button>
          </div>
          {error && <div className="rounded-xl border border-[#e7b3a8] bg-[#fff1ed] p-4 text-sm font-semibold text-[#8b3026]" role="alert">{error}{fallbackAvailable && <button type="button" onClick={() => { setResult(demoObservationResult); setMode("demo"); setDocumentState(null); setDocumentRevision((value) => value + 1); setResultContext({ playName: sendInput.playName, age: sendInput.age }); setError(""); }} className="ml-3 underline">시연용 샘플 불러오기</button>}</div>}
          <DraftManager kind="observation" suggestedName={form.playName || "놀이 기록"} data={safeDraftData} onLoad={(value) => { const restored = value as { form: Partial<FormState>; result: ObservationResult | null; mode: GenerationMode; document?: unknown; resultContext?: ResultContext }; const restoredForm = { ...initialForm, ...restored.form, names: "" }; setForm(restoredForm); setResult(restored.result); setMode(restored.mode); setDocumentState(parseEditableDocumentState(restored.document)); setResultContext(restored.resultContext || (restored.result ? { playName: restoredForm.playName, age: restoredForm.age } : null)); setDocumentRevision((revision) => revision + 1); setPrivacyConfirmed(false); }} />
        </form>

        <div className="lg:sticky lg:top-5">
          {result ? <><EditableDocument key={`document-${documentRevision}`} title={settings.customDocumentTitle || result.title} sections={sections} mode={mode} prefix="놀이기록" initialDocument={documentState} onDocumentChange={setDocumentState} /><PlaySupportImageGenerator key={`image-${documentRevision}`} playName={(resultContext?.playName || form.playName || "놀이 관찰").slice(0, 120)} age={resultContext?.age || form.age} supportSummary={[...result.playSupport.environment, ...result.playSupport.materials].join(", ")} /></> : <div className="grid min-h-[32rem] place-items-center rounded-[2rem] border border-dashed border-[#b8c8be] bg-[rgba(255,253,248,0.7)] p-8 text-center"><div><Sparkles className="mx-auto text-[var(--sage)]" size={34} aria-hidden="true" /><h2 className="mt-4 text-xl font-black">아직 만든 초안이 없습니다</h2><p className="mt-2 max-w-sm leading-7 text-[var(--muted)]">관찰 메모 하나를 바탕으로 객관적 기록, 학부모용 이야기, 다음 놀이 지원과 교사 확인 항목을 만듭니다.</p></div></div>}
        </div>
      </div>
    </div>
  );
}
