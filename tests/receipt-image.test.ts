import { describe, expect, it } from "vitest";
import { isSupportedReceiptMime, MAX_RECEIPT_COUNT, validateReceiptSelection } from "@/lib/receipt-image";

describe("영수증 이미지 선택 검증", () => {
  it("JPG, PNG, WebP만 허용한다", () => {
    expect(isSupportedReceiptMime("image/jpeg")).toBe(true);
    expect(isSupportedReceiptMime("image/png")).toBe(true);
    expect(isSupportedReceiptMime("image/webp")).toBe(true);
    expect(isSupportedReceiptMime("image/heic")).toBe(false);
    expect(() => validateReceiptSelection([new File(["x"], "receipt.heic", { type: "image/heic" })])).toThrow("JPG, PNG, WebP");
  });

  it("빈 선택과 5장을 넘는 선택을 거부한다", () => {
    expect(() => validateReceiptSelection([])).toThrow("1장 이상");
    const files = Array.from({ length: MAX_RECEIPT_COUNT + 1 }, (_, index) => new File(["x"], `${index}.jpg`, { type: "image/jpeg" }));
    expect(() => validateReceiptSelection(files)).toThrow("5장까지");
  });
});
