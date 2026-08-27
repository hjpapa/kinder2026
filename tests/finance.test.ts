import { describe, expect, it } from "vitest";
import {
  calculateEditableReceiptTotal,
  calculateReceiptItemAmount,
  calculateSettlementTotal,
  normalizeReceiptExtraction,
  receiptTotalDifference,
  type EditableReceipt,
} from "@/lib/finance";
import type { ReceiptExtractionResult } from "@/lib/schemas";

const extraction: ReceiptExtractionResult = {
  receipts: [{
    sourceIndex: 1,
    merchant: "  누리문구  ",
    purchaseDate: "2026-09-10",
    items: [
      { description: "색지", quantity: 2, unitPrice: 3_000, printedAmount: 6_000, confidence: "high", needsReview: false },
      { description: "할인", quantity: null, unitPrice: null, printedAmount: -500, confidence: "medium", needsReview: false },
    ],
    printedTotal: 5_500,
    warnings: [],
  }],
  reviewFlags: [],
};

describe("품의·정산 금액 계산", () => {
  it("인쇄 금액을 우선하고 없으면 수량×단가를 코드로 계산한다", () => {
    expect(calculateReceiptItemAmount({ quantity: 2, unitPrice: 3_000, printedAmount: 5_900 })).toBe(5_900);
    expect(calculateReceiptItemAmount({ quantity: 2, unitPrice: 3_000, printedAmount: null })).toBe(6_000);
    expect(calculateReceiptItemAmount({ quantity: null, unitPrice: 3_000, printedAmount: null })).toBeNull();
  });

  it("할인을 포함한 품목 합계와 전체 정산 합계를 계산한다", () => {
    const receipts = normalizeReceiptExtraction(extraction);
    expect(calculateEditableReceiptTotal(receipts[0])).toBe(5_500);
    expect(calculateSettlementTotal(receipts)).toBe(5_500);
    expect(receiptTotalDifference(receipts[0])).toBe(0);
  });

  it("품목 금액이 빠지면 영수증 인쇄 총액을 사용하고 둘 다 없으면 확인 필요로 남긴다", () => {
    const receipt: EditableReceipt = {
      id: "receipt-1",
      sourceIndex: 1,
      merchant: null,
      purchaseDate: null,
      printedTotal: 12_000,
      warnings: [],
      items: [{ id: "item-1", description: "확인 품목", quantity: null, unitPrice: null, printedAmount: null, confidence: "low", needsReview: true }],
    };
    expect(calculateEditableReceiptTotal(receipt)).toBe(12_000);
    expect(calculateSettlementTotal([{ ...receipt, printedTotal: null }])).toBeNull();
  });

  it("판독 신뢰도가 낮은 항목은 교사 확인 대상으로 정규화한다", () => {
    const receipts = normalizeReceiptExtraction(extraction);
    expect(receipts[0].merchant).toBe("누리문구");
    expect(receipts[0].items[0].needsReview).toBe(false);
    expect(receipts[0].items[1].needsReview).toBe(true);
    expect(receipts[0].items[1].printedAmount).toBe(-500);
  });
});
