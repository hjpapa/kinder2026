import type { BudgetItemInput } from "@/lib/schemas";

export function calculateBudgetAmount(item: Pick<BudgetItemInput, "quantity" | "unitPrice">) {
  if (item.quantity === null || item.unitPrice === null) return null;
  if (!Number.isFinite(item.quantity) || !Number.isFinite(item.unitPrice)) return null;
  return Math.round(item.quantity * item.unitPrice * 100) / 100;
}

export function calculateBudgetTotal(items: Array<Pick<BudgetItemInput, "quantity" | "unitPrice">>) {
  if (!items.length) return null;
  const amounts = items.map(calculateBudgetAmount);
  if (amounts.some((amount) => amount === null)) return null;
  return amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
}

export function formatWon(value: number | null) {
  return value === null ? "확인 필요" : `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}
