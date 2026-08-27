import { describe, expect, it } from "vitest";
import { demoEventPlanResult, demoEventReportResult, demoObservationResult, demoParentNoticeResult } from "@/lib/demo-data";
import { eventPlanInputSchema, eventPlanResultSchema, eventReportInputSchema, eventReportResultSchema, observationInputSchema, observationResultSchema, parentNoticeResultSchema } from "@/lib/schemas";

describe("Structured Output Zod 스키마", () => {
  it("모든 시연용 결과가 구조화 출력 스키마를 통과한다", () => {
    expect(observationResultSchema.safeParse(demoObservationResult).success).toBe(true);
    expect(eventPlanResultSchema.safeParse(demoEventPlanResult).success).toBe(true);
    expect(eventReportResultSchema.safeParse(demoEventReportResult).success).toBe(true);
    expect(parentNoticeResultSchema.safeParse(demoParentNoticeResult).success).toBe(true);
  });

  it("필수 입력이 비어 있거나 너무 길면 거부한다", () => {
    expect(observationInputSchema.safeParse({}).success).toBe(false);
    expect(eventPlanInputSchema.safeParse({ eventName: "", activityIdeas: "" }).success).toBe(false);
    expect(eventReportInputSchema.safeParse({ eventName: "행사", actualActivities: "짧음" }).success).toBe(false);
  });

  it("제목이나 핵심 본문이 빈 AI 결과를 거부한다", () => {
    expect(observationResultSchema.safeParse({ ...demoObservationResult, objectiveRecord: "" }).success).toBe(false);
    expect(eventPlanResultSchema.safeParse({ ...demoEventPlanResult, preparationSchedule: [] }).success).toBe(false);
    expect(eventReportResultSchema.safeParse({ ...demoEventReportResult, childResponses: [] }).success).toBe(false);
  });
});
