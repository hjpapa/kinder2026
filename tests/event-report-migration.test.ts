import { describe, expect, it } from "vitest";
import { demoEventReportResult } from "@/lib/demo-data";
import { parseEventReportResult } from "@/lib/event-report-migration";

describe("결과보고 초안 호환", () => {
  it("현재 결과 형식을 그대로 읽는다", () => {
    expect(parseEventReportResult(demoEventReportResult)).toEqual(demoEventReportResult);
  });

  it("잘못된 결과는 읽지 않는다", () => {
    expect(parseEventReportResult({ documentTitle: "불완전" })).toBeNull();
  });
});
