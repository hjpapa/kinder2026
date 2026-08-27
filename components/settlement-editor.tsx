"use client";

import { Plus, Trash2 } from "lucide-react";
import { inputClass } from "@/components/form-controls";
import { formatWon } from "@/lib/budget";
import {
  calculateEditableReceiptTotal,
  calculateReceiptItemAmount,
  receiptTotalDifference,
  type EditableReceipt,
  type EditableReceiptItem,
} from "@/lib/finance";

const confidenceLabel = { high: "선명", medium: "확인 권장", low: "확인 필요" } as const;

function numericInput(value: number | null) {
  return value === null ? "" : String(value);
}

function parsedNumber(value: string) {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function SettlementEditor({ receipts, onChange }: { receipts: EditableReceipt[]; onChange: (receipts: EditableReceipt[]) => void }) {
  function updateReceipt(receiptId: string, patch: Partial<EditableReceipt>) {
    onChange(receipts.map((receipt) => receipt.id === receiptId ? { ...receipt, ...patch } : receipt));
  }

  function updateItem(receiptId: string, itemId: string, patch: Partial<EditableReceiptItem>) {
    onChange(receipts.map((receipt) => receipt.id === receiptId ? {
      ...receipt,
      items: receipt.items.map((item) => item.id === itemId ? { ...item, ...patch } : item),
    } : receipt));
  }

  function addItem(receiptId: string) {
    const nextItem: EditableReceiptItem = {
      id: `manual-${crypto.randomUUID()}`,
      description: "",
      quantity: null,
      unitPrice: null,
      printedAmount: null,
      confidence: "low",
      needsReview: true,
    };
    onChange(receipts.map((receipt) => receipt.id === receiptId ? { ...receipt, items: [...receipt.items, nextItem] } : receipt));
  }

  function removeItem(receiptId: string, itemId: string) {
    onChange(receipts.map((receipt) => receipt.id === receiptId ? { ...receipt, items: receipt.items.filter((item) => item.id !== itemId) } : receipt));
  }

  return (
    <div className="grid gap-5">
      {receipts.map((receipt) => {
        const receiptTotal = calculateEditableReceiptTotal(receipt);
        const difference = receiptTotalDifference(receipt);
        return (
          <section key={receipt.id} className="rounded-2xl border border-[var(--line)] bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-black tracking-[0.08em] text-[var(--sage)]">영수증 {receipt.sourceIndex}</p><h3 className="mt-1 text-lg font-black">추출값 확인</h3></div>
              <strong className="rounded-full bg-[var(--sage-soft)] px-3 py-1.5 text-sm text-[var(--sage-dark)]">계산 합계 {formatWon(receiptTotal)}</strong>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-bold">구매처<input value={receipt.merchant || ""} onChange={(event) => updateReceipt(receipt.id, { merchant: event.target.value || null })} className={inputClass} maxLength={200} /></label>
              <label className="text-sm font-bold">구매일<input value={receipt.purchaseDate || ""} onChange={(event) => updateReceipt(receipt.id, { purchaseDate: event.target.value || null })} className={inputClass} maxLength={40} placeholder="예: 2026-09-10" /></label>
              <label className="text-sm font-bold">영수증 인쇄 총액<input type="number" inputMode="decimal" value={numericInput(receipt.printedTotal)} onChange={(event) => updateReceipt(receipt.id, { printedTotal: parsedNumber(event.target.value) })} className={inputClass} min={0} max={1_000_000_000} /></label>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead><tr className="bg-[var(--sage-soft)]"><th className="rounded-l-lg p-2.5">품목</th><th className="p-2.5">수량</th><th className="p-2.5">단가</th><th className="p-2.5">인쇄 금액</th><th className="p-2.5">적용 금액</th><th className="p-2.5">판독</th><th className="rounded-r-lg p-2.5"><span className="sr-only">삭제</span></th></tr></thead>
                <tbody>{receipt.items.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--line)] align-top">
                    <td className="p-2"><input aria-label={`영수증 ${receipt.sourceIndex} 품목명`} value={item.description} onChange={(event) => updateItem(receipt.id, item.id, { description: event.target.value })} className={`${inputClass} mt-0 min-w-48`} maxLength={200} /></td>
                    <td className="p-2"><input aria-label={`${item.description || "품목"} 수량`} type="number" inputMode="decimal" value={numericInput(item.quantity)} onChange={(event) => updateItem(receipt.id, item.id, { quantity: parsedNumber(event.target.value) })} className={`${inputClass} mt-0 w-24`} min={0} max={1_000_000} /></td>
                    <td className="p-2"><input aria-label={`${item.description || "품목"} 단가`} type="number" inputMode="decimal" value={numericInput(item.unitPrice)} onChange={(event) => updateItem(receipt.id, item.id, { unitPrice: parsedNumber(event.target.value) })} className={`${inputClass} mt-0 w-32`} min={0} max={1_000_000_000} /></td>
                    <td className="p-2"><input aria-label={`${item.description || "품목"} 인쇄 금액`} type="number" inputMode="decimal" value={numericInput(item.printedAmount)} onChange={(event) => updateItem(receipt.id, item.id, { printedAmount: parsedNumber(event.target.value) })} className={`${inputClass} mt-0 w-32`} min={-1_000_000_000} max={1_000_000_000} /></td>
                    <td className="whitespace-nowrap p-3 font-black">{formatWon(calculateReceiptItemAmount(item))}</td>
                    <td className="whitespace-nowrap p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.needsReview || item.confidence !== "high" ? "bg-[var(--sun-soft)] text-[#815516]" : "bg-[var(--sage-soft)] text-[var(--sage-dark)]"}`}>{confidenceLabel[item.confidence]}</span></td>
                    <td className="p-2"><button type="button" onClick={() => removeItem(receipt.id, item.id)} className="grid size-11 place-items-center rounded-lg text-[#a0382d] hover:bg-[#fae8e2]" aria-label={`${item.description || "품목"} 삭제`}><Trash2 size={17} aria-hidden="true" /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <button type="button" onClick={() => addItem(receipt.id)} className="action-button mt-3"><Plus size={17} aria-hidden="true" /> 누락 품목 직접 추가</button>
            {difference !== null && Math.abs(difference) >= 1 && <p className="mt-3 rounded-xl bg-[var(--sun-soft)] p-3 text-sm font-semibold text-[#68491f]">품목 합계와 영수증 인쇄 총액이 {formatWon(Math.abs(difference))} 다릅니다. 할인·부가세 또는 판독값을 확인해 주세요.</p>}
            {receipt.warnings.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm leading-6 text-[#8a581d]">{receipt.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
          </section>
        );
      })}
    </div>
  );
}
