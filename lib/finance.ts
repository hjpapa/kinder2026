import type { ReceiptExtractionResult } from "@/lib/schemas";

export type EditableReceiptItem = ReceiptExtractionResult["receipts"][number]["items"][number] & {
  id: string;
};

export type EditableReceipt = Omit<ReceiptExtractionResult["receipts"][number], "items"> & {
  id: string;
  items: EditableReceiptItem[];
};

const MAX_MONEY = 1_000_000_000;
const MAX_QUANTITY = 1_000_000;

function safeNumber(value: number | null, max: number, allowNegative = false) {
  if (value === null || !Number.isFinite(value)) return null;
  if ((!allowNegative && value < 0) || Math.abs(value) > max) return null;
  return Math.round(value * 100) / 100;
}

export function calculateReceiptItemAmount(item: Pick<EditableReceiptItem, "quantity" | "unitPrice" | "printedAmount">) {
  const printed = safeNumber(item.printedAmount, MAX_MONEY, true);
  if (printed !== null) return printed;
  const quantity = safeNumber(item.quantity, MAX_QUANTITY);
  const unitPrice = safeNumber(item.unitPrice, MAX_MONEY);
  if (quantity === null || unitPrice === null) return null;
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function calculateReceiptItemsTotal(items: Array<Pick<EditableReceiptItem, "quantity" | "unitPrice" | "printedAmount">>) {
  if (!items.length) return null;
  const amounts = items.map(calculateReceiptItemAmount);
  if (amounts.some((amount) => amount === null)) return null;
  return Math.round(amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0) * 100) / 100;
}

export function calculateEditableReceiptTotal(receipt: Pick<EditableReceipt, "items" | "printedTotal">) {
  const itemTotal = calculateReceiptItemsTotal(receipt.items);
  if (itemTotal !== null) return itemTotal;
  return safeNumber(receipt.printedTotal, MAX_MONEY);
}

export function calculateSettlementTotal(receipts: Array<Pick<EditableReceipt, "items" | "printedTotal">>) {
  if (!receipts.length) return null;
  const receiptTotals = receipts.map(calculateEditableReceiptTotal);
  if (receiptTotals.some((amount) => amount === null)) return null;
  return Math.round(receiptTotals.reduce<number>((sum, amount) => sum + (amount ?? 0), 0) * 100) / 100;
}

export function receiptTotalDifference(receipt: Pick<EditableReceipt, "items" | "printedTotal">) {
  const itemTotal = calculateReceiptItemsTotal(receipt.items);
  const printedTotal = safeNumber(receipt.printedTotal, MAX_MONEY);
  if (itemTotal === null || printedTotal === null) return null;
  return Math.round((printedTotal - itemTotal) * 100) / 100;
}

export function normalizeReceiptExtraction(result: ReceiptExtractionResult): EditableReceipt[] {
  return [...result.receipts]
    .sort((first, second) => first.sourceIndex - second.sourceIndex)
    .map((receipt) => ({
      ...receipt,
      id: `receipt-${receipt.sourceIndex}`,
      merchant: receipt.merchant?.trim() || null,
      purchaseDate: receipt.purchaseDate?.trim() || null,
      printedTotal: safeNumber(receipt.printedTotal, MAX_MONEY),
      warnings: receipt.warnings.map((warning) => warning.trim()).filter(Boolean),
      items: receipt.items.map((item, itemIndex) => {
        const quantity = safeNumber(item.quantity, MAX_QUANTITY);
        const unitPrice = safeNumber(item.unitPrice, MAX_MONEY);
        const printedAmount = safeNumber(item.printedAmount, MAX_MONEY, true);
        const invalidNumber = quantity !== item.quantity || unitPrice !== item.unitPrice || printedAmount !== item.printedAmount;
        return {
          ...item,
          id: `receipt-${receipt.sourceIndex}-item-${itemIndex + 1}`,
          description: item.description.trim() || "품목 확인 필요",
          quantity,
          unitPrice,
          printedAmount,
          needsReview: item.needsReview || item.confidence !== "high" || invalidNumber,
        };
      }),
    }));
}
