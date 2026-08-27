import { describe, expect, it } from "vitest";
import { demoApprovalResult, demoEventPlanResult, demoEventReportResult, demoObservationResult, demoParentNoticeResult, demoReceiptExtractionResult } from "@/lib/demo-data";
import { approvalResultSchema, eventPlanInputSchema, eventPlanResultSchema, eventReportInputSchema, eventReportResultSchema, observationInputSchema, observationResultSchema, parentNoticeResultSchema, receiptExtractionResultSchema } from "@/lib/schemas";

describe("Structured Output Zod 스키마", () => {
  it("모든 시연용 결과가 구조화 출력 스키마를 통과한다", () => {
    expect(observationResultSchema.safeParse(demoObservationResult).success).toBe(true);
    expect(eventPlanResultSchema.safeParse(demoEventPlanResult).success).toBe(true);
    expect(eventReportResultSchema.safeParse(demoEventReportResult).success).toBe(true);
    expect(parentNoticeResultSchema.safeParse(demoParentNoticeResult).success).toBe(true);
    expect(approvalResultSchema.safeParse(demoApprovalResult).success).toBe(true);
    expect(receiptExtractionResultSchema.safeParse(demoReceiptExtractionResult).success).toBe(true);
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

  it("선택적인 행사 이름·대상·놀이 이름은 비워도 핵심 메모가 있으면 허용한다", () => {
    const styleContext = { institutionTone: "", customTitle: "", customSections: [], templateName: "", guidelineSources: [] };
    expect(observationInputSchema.safeParse({
      age: "만 5세", observationDate: "", playName: "", place: "", childrenCount: "", memo: "유아가 종이 상자를 세워 길을 만들고 자동차를 움직였다.", directQuotes: "", curiosity: "", resultLength: "보통", parentTone: "따뜻하게", styleContext,
    }).success).toBe(true);
    expect(eventPlanInputSchema.safeParse({
      eventName: "", eventType: "", target: "", plannedDate: "", plannedTime: "", place: "", expectedParticipants: "", personInCharge: "", supportStaff: "", purpose: "", childExperience: "", curriculumLink: "", parentParticipation: "", expectedFollowUp: "", availableSpaces: "", totalTime: "", preparationTime: "", purchasing: "", availableMaterials: "", rainPlan: "", accessibility: "", staffCount: "", mustInclude: "", exclude: "", activityIdeas: "가을 자연물로 교실과 마당에서 놀이 행사를 운영하고 싶다.", budgetItems: [], styleContext,
    }).success).toBe(true);
    expect(eventReportInputSchema.safeParse({
      eventName: "", target: "", planSource: "", planObjectives: "", plannedDateTime: "", plannedPlace: "", plannedParticipants: "", plannedActivities: "", plannedRoles: "", plannedMaterials: "", plannedSafety: "", actualDateTime: "", actualPlace: "", actualParticipants: "", actualPersonInCharge: "", conditions: "", cancellationStatus: "운영", actualActivities: "강당에서 투호와 제기차기를 순환하며 실제로 운영했다.", sequence: "", changes: "", changeReasons: "", omittedActivities: "", addedActivities: "", childBehaviors: "", childQuotes: "", repeatedActivities: "", difficulties: "", teacherSupport: "", safetyIncidents: "", safetyReflection: "", plannedBudgetTotal: null, actualBudgetTotal: null, budgetReason: "", evidenceDocuments: "", strengths: "", regrets: "", nextChanges: "", adaptationNotes: "", styleContext,
    }).success).toBe(true);
  });
});
