import { describe, expect, it } from "vitest";
import { calculateBudgetAmount, calculateBudgetTotal } from "@/lib/budget";

describe("예산 코드 계산", () => {
  it("수량과 단가를 곱하고 합계를 계산한다", () => {
    expect(calculateBudgetAmount({ quantity: 3, unitPrice: 2500 })).toBe(7500);
    expect(calculateBudgetTotal([{ quantity: 3, unitPrice: 2500 }, { quantity: 2, unitPrice: 1000 }])).toBe(9500);
  });

  it("입력하지 않은 수량이나 단가는 금액을 만들지 않는다", () => {
    expect(calculateBudgetAmount({ quantity: null, unitPrice: 2500 })).toBeNull();
    expect(calculateBudgetAmount({ quantity: 3, unitPrice: null })).toBeNull();
    expect(calculateBudgetTotal([{ quantity: 3, unitPrice: 2500 }, { quantity: null, unitPrice: 1000 }])).toBeNull();
    expect(calculateBudgetTotal([])).toBeNull();
  });
});
