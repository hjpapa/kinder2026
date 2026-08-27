import { describe, expect, it } from "vitest";
import { anonymizeText, needsConcreteEvidence, parseNames } from "@/lib/privacy";

describe("개인정보 익명화", () => {
  it("실제 이름을 순서대로 유아 A, B로 치환한다", () => {
    const result = anonymizeText("민준이 지우에게 민준의 봉투를 건넸다.", parseNames("민준, 지우"));
    expect(result.text).toBe("유아 A이 유아 B에게 유아 A의 봉투를 건넸다.");
    expect(result.replacements).toEqual([{ original: "민준", replacement: "유아 A" }, { original: "지우", replacement: "유아 B" }]);
  });

  it("전화번호, 이메일, 주민등록번호 형태를 마스킹한다", () => {
    const result = anonymizeText("010-1234-5678 test@example.com 990101-1234567", []);
    expect(result.text).not.toContain("010-1234-5678");
    expect(result.text).not.toContain("test@example.com");
    expect(result.text).not.toContain("990101-1234567");
    expect(result.maskedTypes).toEqual(expect.arrayContaining(["전화번호", "이메일", "주민등록번호 형태"]));
  });

  it("추상적 반응만 짧게 입력하면 보완 질문 대상이다", () => {
    expect(needsConcreteEvidence("아이들이 매우 좋아했음")).toBe(true);
    expect(needsConcreteEvidence("유아 세 명이 같은 활동에 다시 참여하고 친구에게 방법을 설명했다.")).toBe(false);
  });
});
