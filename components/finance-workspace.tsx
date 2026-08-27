"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FileCheck2, LoaderCircle, Plus, ReceiptText, Sparkles, Trash2, WalletCards } from "lucide-react";
import { DraftManager } from "@/components/draft-manager";
import { EditableDocument } from "@/components/editable-document";
import { Field, FormSection, TextArea, TextInput } from "@/components/form-controls";
import { PrivacyNotice } from "@/components/privacy-notice";
import { ReceiptUploader } from "@/components/receipt-uploader";
import { SettlementEditor } from "@/components/settlement-editor";
import { settingsToStyleContext, useAppSettings } from "@/hooks/use-app-settings";
import { useAutoDraft } from "@/hooks/use-auto-draft";
import { postGeneration, type GenerationMode } from "@/lib/api-client";
import { calculateBudgetTotal, formatWon } from "@/lib/budget";
import { incrementRequestStat, readStorage, removeStorage } from "@/lib/client-storage";
import { approvalSections, parseEditableDocumentState, settlementSections, type EditableDocumentState } from "@/lib/document-sections";
import { calculateReceiptItemAmount, calculateSettlementTotal, normalizeReceiptExtraction, type EditableReceipt } from "@/lib/finance";
import type { ApprovalInput, ApprovalResult, BudgetItemInput, ReceiptExtractionResult, SettlementContext } from "@/lib/schemas";

type FinanceTab = "approval" | "settlement";
type ApprovalForm = Omit<ApprovalInput, "styleContext">;
type SettlementForm = Omit<SettlementContext, "privacyConfirmed"> & { privacyConfirmed: boolean };

const emptyBudgetItem = (): BudgetItemInput => ({ id: crypto.randomUUID(), item: "", quantity: null, unitPrice: null, budgetCategory: "", vendor: "", note: "" });
const initialApproval: ApprovalForm = { subject: "", memo: "", plannedDate: "", budgetCategory: "", items: [], notes: "" };
const sampleApproval: ApprovalForm = {
  subject: "가을 자연물 콜라주 미술재료 구입",
  memo: "가을 자연물 콜라주 활동에 사용할 색지 10묶음과 투명테이프 5개를 구입하려고 합니다.",
  plannedDate: "2026-09-10",
  budgetCategory: "",
  items: [{ id: "sample-finance-1", item: "색지", quantity: 10, unitPrice: 2_500, budgetCategory: "", vendor: "", note: "콜라주 활동" }],
  notes: "기관 결재 전 예산 과목과 구매처 확인",
};
const initialSettlement: SettlementForm = { subject: "", purpose: "", budgetCategory: "", notes: "", privacyConfirmed: false };

type ReceiptPayload = { data?: ReceiptExtractionResult; mode?: GenerationMode; error?: string; code?: string; fallbackAvailable?: boolean };

async function postReceiptExtraction(context: SettlementContext, files: File[], signal?: AbortSignal) {
  const formData = new FormData();
  formData.append("context", JSON.stringify(context));
  files.forEach((file) => formData.append("receipts", file, file.name));
  const response = await fetch("/api/extract/receipts", { method: "POST", body: formData, signal });
  const raw = await response.text();
  let payload: ReceiptPayload = {};
  try { payload = raw ? JSON.parse(raw) as ReceiptPayload : {}; } catch { /* Vercel can return an HTML error page. */ }
  if (!response.ok || !payload.data) {
    const error = new Error(payload.error || (response.status === 429 ? "요청이 많습니다. 잠시 후 다시 시도해 주세요." : "영수증을 읽지 못했습니다.")) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  return { data: payload.data, mode: payload.mode || "live" };
}

function numberValue(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function FinanceWorkspace() {
  const settings = useAppSettings();
  const [tab, setTab] = useState<FinanceTab>(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "settlement" ? "settlement" : "approval");

  const [approvalForm, setApprovalForm] = useState<ApprovalForm>(initialApproval);
  const [approvalResult, setApprovalResult] = useState<ApprovalResult | null>(null);
  const [approvalInput, setApprovalInput] = useState<ApprovalInput | null>(null);
  const [approvalMode, setApprovalMode] = useState<GenerationMode>("live");
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  const [approvalDocument, setApprovalDocument] = useState<EditableDocumentState | null>(null);
  const [approvalRevision, setApprovalRevision] = useState(0);
  const approvalController = useRef<AbortController | null>(null);

  const [settlementForm, setSettlementForm] = useState<SettlementForm>(initialSettlement);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receipts, setReceipts] = useState<EditableReceipt[]>([]);
  const [receiptReviewFlags, setReceiptReviewFlags] = useState<ReceiptExtractionResult["reviewFlags"]>([]);
  const [receiptReviewed, setReceiptReviewed] = useState(false);
  const [settlementSnapshot, setSettlementSnapshot] = useState<EditableReceipt[] | null>(null);
  const [settlementMode, setSettlementMode] = useState<GenerationMode>("live");
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementError, setSettlementError] = useState("");
  const [settlementDocument, setSettlementDocument] = useState<EditableDocumentState | null>(null);
  const [settlementRevision, setSettlementRevision] = useState(0);
  const settlementController = useRef<AbortController | null>(null);

  const approvalRequest: ApprovalInput = useMemo(() => ({ ...approvalForm, items: approvalForm.items.filter((item) => item.item.trim()), styleContext: settingsToStyleContext(settings) }), [approvalForm, settings]);
  const approvalBudgetTotal = calculateBudgetTotal(approvalForm.items);
  const approvalDraft = useMemo(() => ({ form: approvalForm, result: approvalResult, resultInput: approvalInput, mode: approvalMode, document: approvalDocument }), [approvalForm, approvalResult, approvalInput, approvalMode, approvalDocument]);
  const settlementDraft = useMemo(() => ({ form: { ...settlementForm, privacyConfirmed: false }, receipts, reviewFlags: receiptReviewFlags, snapshot: settlementSnapshot, mode: settlementMode, document: settlementDocument }), [settlementForm, receipts, receiptReviewFlags, settlementSnapshot, settlementMode, settlementDocument]);
  useAutoDraft("finance-approval", approvalDraft, settings.autoSave);
  useAutoDraft("finance-settlement", settlementDraft, settings.autoSave);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") !== "plan") return;
    const transfer = readStorage<unknown>("finance-transfer", null);
    removeStorage("finance-transfer");
    if (!transfer || typeof transfer !== "object" || Array.isArray(transfer)) return;
    const value = transfer as { subject?: unknown; eventName?: unknown; memo?: unknown; items?: unknown };
    const subject = typeof value.subject === "string" ? value.subject.slice(0, 150) : "";
    const eventName = typeof value.eventName === "string" ? value.eventName.slice(0, 150) : "";
    let memo = typeof value.memo === "string" ? value.memo.slice(0, 6_000) : "";
    if (memo.trim().length < 10) memo = `${eventName || subject} 운영에 필요한 물품을 구입하려고 합니다.`;
    const items = Array.isArray(value.items) ? value.items.filter((item): item is BudgetItemInput => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<BudgetItemInput>;
      return typeof candidate.id === "string" && typeof candidate.item === "string" && candidate.item.trim().length > 0;
    }).slice(0, 30) : [];
    const timer = window.setTimeout(() => {
      setApprovalForm((current) => ({ ...current, subject: subject || `${eventName} 행사 품의`, memo, items }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submitApproval(event: FormEvent) {
    event.preventDefault();
    approvalController.current?.abort();
    approvalController.current = new AbortController();
    setApprovalLoading(true);
    setApprovalError("");
    try {
      const generated = await postGeneration<ApprovalResult>("/api/generate/approval", approvalRequest, approvalController.current.signal);
      setApprovalResult(generated.data);
      setApprovalInput(approvalRequest);
      setApprovalMode(generated.mode);
      setApprovalDocument(null);
      setApprovalRevision((value) => value + 1);
      incrementRequestStat("approval");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setApprovalError(error instanceof Error ? error.message : "품의서 초안을 만들지 못했습니다.");
    } finally {
      setApprovalLoading(false);
    }
  }

  function updateApproval<K extends keyof ApprovalForm>(key: K, value: ApprovalForm[K]) {
    setApprovalForm((current) => ({ ...current, [key]: value }));
  }

  function updateApprovalItem(id: string, key: keyof BudgetItemInput, value: string) {
    setApprovalForm((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, [key]: key === "quantity" || key === "unitPrice" ? numberValue(value) : value } : item),
    }));
  }

  async function submitSettlement(event: FormEvent) {
    event.preventDefault();
    if (!receiptFiles.length) { setSettlementError("영수증 이미지를 1장 이상 선택해 주세요."); return; }
    if (!settlementForm.privacyConfirmed) { setSettlementError("민감정보 확인과 AI 전송에 동의해 주세요."); return; }
    const context: SettlementContext = { ...settlementForm, privacyConfirmed: true };
    settlementController.current?.abort();
    settlementController.current = new AbortController();
    setSettlementLoading(true);
    setSettlementError("");
    try {
      const extracted = await postReceiptExtraction(context, receiptFiles, settlementController.current.signal);
      setReceipts(normalizeReceiptExtraction(extracted.data));
      setReceiptReviewFlags(extracted.data.reviewFlags);
      setReceiptReviewed(false);
      setSettlementSnapshot(null);
      setSettlementDocument(null);
      setSettlementMode(extracted.mode);
      incrementRequestStat("receipt-extraction");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSettlementError(error instanceof Error ? error.message : "영수증을 읽지 못했습니다.");
    } finally {
      setSettlementLoading(false);
    }
  }

  function changeReceiptFiles(files: File[]) {
    setReceiptFiles(files);
    setSettlementForm((current) => ({ ...current, privacyConfirmed: false }));
    setReceipts([]);
    setReceiptReviewFlags([]);
    setReceiptReviewed(false);
    setSettlementSnapshot(null);
    setSettlementDocument(null);
  }

  function changeReceipts(next: EditableReceipt[]) {
    setReceipts(next);
    setReceiptReviewed(false);
    setSettlementSnapshot(null);
    setSettlementDocument(null);
  }

  function createSettlementDocument() {
    if (!receiptReviewed) { setSettlementError("영수증의 품목과 금액을 확인한 뒤 확인란을 선택해 주세요."); return; }
    if (receipts.some((receipt) => !receipt.items.length || receipt.items.some((item) => calculateReceiptItemAmount(item) === null))) { setSettlementError("확인되지 않은 품목 금액이 있습니다. 수량·단가 또는 인쇄 금액을 입력해 주세요."); return; }
    const snapshot = receipts.map((receipt) => ({ ...receipt, items: receipt.items.map((item) => ({ ...item, needsReview: false })) }));
    setSettlementSnapshot(snapshot);
    setSettlementDocument(null);
    setSettlementRevision((value) => value + 1);
    setSettlementError("");
  }

  const approvalDocumentSections = approvalResult && approvalInput ? approvalSections(approvalInput, approvalResult) : [];
  const settlementContext: SettlementContext = { ...settlementForm, privacyConfirmed: true };
  const settlementDocumentSections = settlementSnapshot ? settlementSections(settlementContext, settlementSnapshot) : [];
  const settlementTotal = calculateSettlementTotal(receipts);

  return (
    <div>
      <div className="no-print mb-6 flex gap-2 rounded-2xl border border-[var(--line)] bg-white p-2" role="tablist" aria-label="품의와 정산 작업 선택">
        <button type="button" role="tab" aria-selected={tab === "approval"} onClick={() => setTab("approval")} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black ${tab === "approval" ? "bg-[var(--sage-dark)] text-white" : "hover:bg-[var(--sage-soft)]"}`}><WalletCards size={18} aria-hidden="true" /> 예상 품의서</button>
        <button type="button" role="tab" aria-selected={tab === "settlement"} onClick={() => setTab("settlement")} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black ${tab === "settlement" ? "bg-[var(--sage-dark)] text-white" : "hover:bg-[var(--sage-soft)]"}`}><ReceiptText size={18} aria-hidden="true" /> 영수증 정산</button>
      </div>

      {tab === "approval" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
          <form onSubmit={submitApproval} className="grid gap-5">
            <PrivacyNotice compact />
            <FormSection title="두 가지만 먼저 적어 주세요" description="건명과 구매 메모만으로 시작할 수 있습니다. 날짜·금액·예산 과목은 알고 있을 때만 더하세요.">
              <Field label="품의 건명" htmlFor="approval-subject" required><TextInput id="approval-subject" value={approvalForm.subject} onChange={(event) => updateApproval("subject", event.target.value)} required maxLength={150} placeholder="예: 가을 미술재료 구입" /></Field>
              <Field label="무엇을, 왜 구입하나요?" htmlFor="approval-memo" required hint={`${approvalForm.memo.length.toLocaleString()} / 6,000자`}><TextArea id="approval-memo" value={approvalForm.memo} onChange={(event) => updateApproval("memo", event.target.value)} required minLength={10} maxLength={6_000} className="min-h-36" placeholder="예: 자연물 콜라주 활동에 쓸 색지와 투명테이프를 구입하려고 합니다." /></Field>
            </FormSection>

            <details className="paper-note border-[var(--line)] bg-white p-5">
              <summary className="cursor-pointer font-black">날짜·금액·예산 과목도 알고 있어요 <span className="ml-1 text-sm font-medium text-[var(--muted)]">(선택)</span></summary>
              <div className="mt-5 grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2"><Field label="사용 예정일" htmlFor="approval-date"><TextInput id="approval-date" type="date" value={approvalForm.plannedDate} onChange={(event) => updateApproval("plannedDate", event.target.value)} /></Field><Field label="예산 과목" htmlFor="approval-category" hint="비우면 담당자 확인 필요로 표시합니다."><TextInput id="approval-category" value={approvalForm.budgetCategory} onChange={(event) => updateApproval("budgetCategory", event.target.value)} maxLength={120} /></Field></div>
                <div className="grid gap-3">
                  {approvalForm.items.map((item, index) => (
                    <div key={item.id} className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4">
                      <div className="flex items-center justify-between"><strong>예상 품목 {index + 1}</strong><button type="button" onClick={() => updateApproval("items", approvalForm.items.filter((candidate) => candidate.id !== item.id))} className="grid size-11 place-items-center rounded-lg text-[#a0382d] hover:bg-[#fae8e2]" aria-label={`예상 품목 ${index + 1} 삭제`}><Trash2 size={17} aria-hidden="true" /></button></div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3"><Field label="품목" htmlFor={`approval-item-${item.id}`}><TextInput id={`approval-item-${item.id}`} value={item.item} onChange={(event) => updateApprovalItem(item.id, "item", event.target.value)} maxLength={120} /></Field><Field label="수량" htmlFor={`approval-quantity-${item.id}`}><TextInput id={`approval-quantity-${item.id}`} type="number" min={0} inputMode="decimal" value={item.quantity ?? ""} onChange={(event) => updateApprovalItem(item.id, "quantity", event.target.value)} /></Field><Field label="단가" htmlFor={`approval-price-${item.id}`}><TextInput id={`approval-price-${item.id}`} type="number" min={0} inputMode="decimal" value={item.unitPrice ?? ""} onChange={(event) => updateApprovalItem(item.id, "unitPrice", event.target.value)} /></Field></div>
                    </div>
                  ))}
                  <button type="button" onClick={() => updateApproval("items", [...approvalForm.items, emptyBudgetItem()])} className="action-button w-fit"><Plus size={17} aria-hidden="true" /> 알고 있는 품목 추가</button>
                  {approvalForm.items.length > 0 && <p className="rounded-xl bg-[var(--sage-soft)] p-3 text-right font-black text-[var(--sage-dark)]">입력한 예상 합계 {formatWon(approvalBudgetTotal)}</p>}
                </div>
                <Field label="추가 메모" htmlFor="approval-notes"><TextArea id="approval-notes" value={approvalForm.notes} onChange={(event) => updateApproval("notes", event.target.value)} maxLength={2_000} /></Field>
              </div>
            </details>

            <div className="no-print flex flex-wrap gap-3"><button disabled={approvalLoading} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--sage-dark)] px-6 text-lg font-black text-white disabled:opacity-60">{approvalLoading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />} {approvalLoading ? "품의 내용을 정리하고 있어요…" : "예상 품의서 만들기"}</button>{approvalLoading && <button type="button" onClick={() => approvalController.current?.abort()} className="action-button">취소</button>}<button type="button" onClick={() => setApprovalForm(sampleApproval)} className="action-button">샘플</button></div>
            {approvalError && <div className="rounded-xl border border-[#e7b3a8] bg-[#fff1ed] p-4 text-sm font-semibold text-[#8b3026]" role="alert">{approvalError}</div>}
            <DraftManager kind="finance-approval" suggestedName={approvalForm.subject || "예상 품의"} data={approvalDraft} onLoad={(value) => { const restored = value as typeof approvalDraft; setApprovalForm(restored.form); setApprovalResult(restored.result); setApprovalInput(restored.resultInput); setApprovalMode(restored.mode); setApprovalDocument(parseEditableDocumentState(restored.document)); setApprovalRevision((revision) => revision + 1); }} />
          </form>
          <div className="lg:sticky lg:top-5">{approvalResult && approvalInput ? <EditableDocument key={`approval-${approvalRevision}`} title={approvalInput.styleContext.customTitle || approvalResult.documentTitle} sections={approvalDocumentSections} mode={approvalMode} prefix="예상품의서" initialDocument={approvalDocument} onDocumentChange={setApprovalDocument} /> : <EmptyResult icon="approval" />}</div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
          <form onSubmit={submitSettlement} className="grid gap-5">
            <aside className="paper-note border-[#e7c98f] bg-[var(--sun-soft)] p-4 text-sm leading-6 text-[#68491f]"><strong>사진을 올리기 전에 꼭 확인해 주세요.</strong> 카드번호, 승인번호, 회원번호, 이름, 전화번호, 상세 주소가 보이면 가리거나 사진을 잘라 주세요. 선택한 이미지는 항목 판독을 위해 OpenAI로 전송되며 앱 서버에는 저장하지 않습니다. OpenAI 정책에 따른 보안·악용 방지 처리는 적용될 수 있습니다.</aside>
            <FormSection title="정산 기본 정보">
              <Field label="정산 건명" htmlFor="settlement-subject" required><TextInput id="settlement-subject" value={settlementForm.subject} onChange={(event) => setSettlementForm((current) => ({ ...current, subject: event.target.value }))} required maxLength={150} placeholder="예: 가을 미술재료 구입 정산" /></Field>
              <details><summary className="cursor-pointer text-sm font-black text-[var(--sage-dark)]">사용 목적·예산 과목도 입력하기 <span className="font-medium text-[var(--muted)]">(선택)</span></summary><div className="mt-4 grid gap-4"><Field label="사용 목적" htmlFor="settlement-purpose"><TextArea id="settlement-purpose" value={settlementForm.purpose} onChange={(event) => setSettlementForm((current) => ({ ...current, purpose: event.target.value }))} maxLength={2_000} /></Field><Field label="예산 과목" htmlFor="settlement-category" hint="AI가 추정하지 않습니다. 비우면 확인 필요로 남습니다."><TextInput id="settlement-category" value={settlementForm.budgetCategory} onChange={(event) => setSettlementForm((current) => ({ ...current, budgetCategory: event.target.value }))} maxLength={120} /></Field><Field label="비고" htmlFor="settlement-notes"><TextArea id="settlement-notes" value={settlementForm.notes} onChange={(event) => setSettlementForm((current) => ({ ...current, notes: event.target.value }))} maxLength={2_000} /></Field></div></details>
            </FormSection>
            <FormSection title="영수증 사진" description="사진 속 글씨가 화면을 가득 채우고 흔들리지 않을수록 더 잘 읽습니다.">
              <ReceiptUploader files={receiptFiles} onChange={changeReceiptFiles} onError={setSettlementError} disabled={settlementLoading} />
            </FormSection>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm leading-6"><input type="checkbox" checked={settlementForm.privacyConfirmed} onChange={(event) => setSettlementForm((current) => ({ ...current, privacyConfirmed: event.target.checked }))} className="mt-1 size-4 accent-[var(--sage)]" /><span>민감정보를 가렸고, 압축된 영수증 이미지가 항목 판독을 위해 OpenAI로 전송되는 것에 동의합니다.</span></label>
            <div className="no-print flex flex-wrap gap-3"><button disabled={settlementLoading} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--sage-dark)] px-6 text-lg font-black text-white disabled:opacity-60">{settlementLoading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ReceiptText aria-hidden="true" />} {settlementLoading ? "영수증을 읽고 있어요…" : "영수증 읽기"}</button>{settlementLoading && <button type="button" onClick={() => settlementController.current?.abort()} className="action-button">취소</button>}</div>
            {settlementError && <div className="rounded-xl border border-[#e7b3a8] bg-[#fff1ed] p-4 text-sm font-semibold text-[#8b3026]" role="alert">{settlementError}</div>}

            {receipts.length > 0 && <section className="grid gap-4"><div><p className="text-xs font-black tracking-[0.08em] text-[var(--sage)]">AI 판독 뒤 교사 확인</p><h2 className="mt-1 text-xl font-black">원본 영수증을 보며 값을 고쳐 주세요</h2></div><SettlementEditor receipts={receipts} onChange={changeReceipts} />{receiptReviewFlags.length > 0 && <div className="rounded-xl bg-[var(--sun-soft)] p-4 text-sm leading-6 text-[#68491f]"><strong>AI가 확인을 요청한 항목</strong><ul className="mt-2 list-disc pl-5">{receiptReviewFlags.map((flag, index) => <li key={`${flag.sourceIndex}-${flag.field}-${index}`}>영수증 {flag.sourceIndex} · {flag.field}: {flag.reason}</li>)}</ul></div>}<p className="rounded-xl bg-[var(--sage-soft)] p-4 text-right text-lg font-black text-[var(--sage-dark)]">확인 중 정산 합계 {formatWon(settlementTotal)}</p><label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm leading-6"><input type="checkbox" checked={receiptReviewed} onChange={(event) => setReceiptReviewed(event.target.checked)} className="mt-1 size-4 accent-[var(--sage)]" /><span>영수증 원본과 구매처·날짜·품목·금액을 직접 대조했습니다.</span></label><button type="button" onClick={createSettlementDocument} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--sage-dark)] px-6 text-lg font-black text-white"><FileCheck2 aria-hidden="true" /> 확인한 값으로 정산서 만들기</button></section>}
            <DraftManager kind="finance-settlement" suggestedName={settlementForm.subject || "영수증 정산"} data={settlementDraft} onLoad={(value) => { const restored = value as typeof settlementDraft; setSettlementForm({ ...restored.form, privacyConfirmed: false }); setReceiptFiles([]); setReceipts(restored.receipts); setReceiptReviewFlags(restored.reviewFlags); setReceiptReviewed(false); setSettlementSnapshot(restored.snapshot); setSettlementMode(restored.mode); setSettlementDocument(parseEditableDocumentState(restored.document)); setSettlementRevision((revision) => revision + 1); }} />
          </form>
          <div className="lg:sticky lg:top-5">{settlementSnapshot ? <EditableDocument key={`settlement-${settlementRevision}`} title={`${settlementForm.subject} 정산서`} sections={settlementDocumentSections} mode={settlementMode} prefix="정산서" initialDocument={settlementDocument} onDocumentChange={setSettlementDocument} /> : <EmptyResult icon="settlement" />}</div>
        </div>
      )}
    </div>
  );
}

function EmptyResult({ icon }: { icon: FinanceTab }) {
  const Icon = icon === "approval" ? WalletCards : ReceiptText;
  return <div className="grid min-h-[32rem] place-items-center rounded-[2rem] border border-dashed border-[#b8c8be] bg-[rgba(255,253,248,0.7)] p-8 text-center"><div><Icon className="mx-auto text-[var(--sage)]" size={34} aria-hidden="true" /><h2 className="mt-4 text-xl font-black">{icon === "approval" ? "두 줄 메모에서 품의서를 시작해요" : "영수증을 읽고 값을 확인해 주세요"}</h2><p className="mt-2 max-w-sm leading-7 text-[var(--muted)]">{icon === "approval" ? "만든 초안은 항목별로 직접 고친 뒤 DOCX로 받을 수 있습니다." : "AI가 읽은 숫자는 원본과 대조한 뒤에만 정산서로 만듭니다."}</p></div></div>;
}
