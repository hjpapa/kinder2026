import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearWorkroomStorage, createBackup, getSettings, readStorage, restoreBackup, saveDraft, STORAGE_PREFIX, writeStorage } from "@/lib/client-storage";

describe("브라우저 저장과 JSON 백업", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("앱 접두사 안에서만 저장하고 백업·복원한다", () => {
    writeStorage("observation-autosave", { value: "익명화된 초안" });
    localStorage.setItem("unrelated", "keep");
    const backup = createBackup();
    clearWorkroomStorage();
    expect(localStorage.getItem("unrelated")).toBe("keep");
    restoreBackup(backup);
    expect(readStorage("observation-autosave", null)).toEqual({ value: "익명화된 초안" });
  });

  it("도담비서 백업이 아닌 JSON은 거부한다", () => {
    expect(() => restoreBackup('{"hello":"world"}')).toThrow("도담비서 백업 파일 형식");
  });

  it("지원하지 않는 저장 키를 포함한 백업은 거부한다", () => {
    const backup = JSON.stringify({ format: "teacher-ai-workroom-backup", version: 1, data: { "teacher-ai-workroom:v1:unknown": {} } });
    expect(() => restoreBackup(backup)).toThrow("지원하지 않는 백업 항목");
  });

  it("기존 기본 양식 이름을 누리 브랜드로 안전하게 옮긴다", () => {
    writeStorage("settings", {
      institutionTone: "차분하게",
      institutionNameDisplay: "기관명 직접 입력",
      autoSave: true,
      customDocumentTitle: "",
      customSections: [],
      selectedTemplateId: "default",
      templates: [{ id: "default", name: "기본 준비실 양식", tone: "차분하게", documentTitle: "", sectionHeadings: [] }],
      guidelines: [],
    });
    expect(getSettings().templates[0].name).toBe("누리 기본 양식");
  });

  it("저장소 속성 접근이 거부되어도 안전한 실패 값을 반환한다", () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new DOMException("denied", "SecurityError"); },
    });

    try {
      expect(readStorage("settings", "fallback")).toBe("fallback");
      expect(writeStorage("settings", { value: "저장 안 됨" })).toBe(false);
    } finally {
      if (descriptor) Object.defineProperty(window, "localStorage", descriptor);
    }
  });

  it("초안 쓰기가 실패하면 저장된 초안을 반환하지 않는다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    expect(saveDraft("observation", "실패 초안", { value: "내용" })).toBeNull();
  });

  it("백업 복원 중 쓰기가 실패하면 변경 전 값으로 원자적으로 되돌린다", () => {
    const observationKey = `${STORAGE_PREFIX}:observation-autosave`;
    const planKey = `${STORAGE_PREFIX}:event-plan-autosave`;
    const noticeKey = `${STORAGE_PREFIX}:parent-notice-autosave`;
    localStorage.setItem(observationKey, JSON.stringify({ value: "기존 관찰" }));
    localStorage.setItem(planKey, JSON.stringify({ value: "기존 계획" }));
    const backup = JSON.stringify({
      format: "teacher-ai-workroom-backup",
      version: 1,
      data: {
        [observationKey]: { value: "새 관찰" },
        [planKey]: { value: "새 계획" },
        [noticeKey]: { value: "새 안내" },
      },
    });
    const originalSetItem = Storage.prototype.setItem;
    let failed = false;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (!failed && key === planKey) {
        failed = true;
        throw new DOMException("quota exceeded", "QuotaExceededError");
      }
      originalSetItem.call(this, key, value);
    });

    expect(() => restoreBackup(backup)).toThrow("백업을 복원하지 못했습니다");
    expect(JSON.parse(localStorage.getItem(observationKey) || "null")).toEqual({ value: "기존 관찰" });
    expect(JSON.parse(localStorage.getItem(planKey) || "null")).toEqual({ value: "기존 계획" });
    expect(localStorage.getItem(noticeKey)).toBeNull();
  });
});
