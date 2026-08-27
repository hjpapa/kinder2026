import { calculateBudgetAmount, formatWon } from "@/lib/budget";
import type { EventPlanInput, EventPlanResult, EventReportInput, EventReportResult, ObservationResult, ParentNoticeResult } from "@/lib/schemas";

export type DocumentSection = { id: string; title: string; content: string };
export type EditableDocumentState = { sections: DocumentSection[]; reviewed: boolean };

export function parseEditableDocumentState(value: unknown): EditableDocumentState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { sections?: unknown; reviewed?: unknown };
  if (!Array.isArray(candidate.sections) || typeof candidate.reviewed !== "boolean") return null;
  const sections = candidate.sections.filter((section): section is DocumentSection => {
    if (!section || typeof section !== "object") return false;
    const item = section as Partial<DocumentSection>;
    return typeof item.id === "string" && typeof item.title === "string" && typeof item.content === "string";
  });
  if (!sections.length || sections.length !== candidate.sections.length || sections.length > 24) return null;
  return { sections, reviewed: candidate.reviewed };
}

const bullets = (items: string[]) => items.length ? items.map((item) => `- ${item}`).join("\n") : "- 추가 정보 필요";
const checkboxes = (items: string[]) => items.map((item) => `- [ ] ${item}`).join("\n");
const cell = (value: string | number | null | undefined) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ") || "추가 정보 필요";
const table = (headers: string[], rows: Array<Array<string | number | null | undefined>>) => [
  `| ${headers.join(" | ")} |`,
  `| ${headers.map(() => "---").join(" | ")} |`,
  ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
].join("\n");

export function observationSections(result: ObservationResult): DocumentSection[] {
  return [
    { id: "objective", title: "객관적 관찰기록", content: result.objectiveRecord },
    { id: "parent", title: "학부모용 놀이 이야기", content: result.parentStory },
    { id: "support", title: "다음 놀이 지원", content: `### 환경\n${bullets(result.playSupport.environment)}\n\n### 자료\n${bullets(result.playSupport.materials)}\n\n### 열린 질문\n${bullets(result.playSupport.openQuestions)}\n\n### 안전하게 살펴볼 점\n${bullets(result.playSupport.safetyPoints)}\n\n### 다음에 더 관찰할 점\n${bullets(result.playSupport.nextObservationPoints)}` },
    { id: "review", title: "교사 확인", content: result.reviewFlags.length ? result.reviewFlags.map((flag) => `- **${flag.category} — ${flag.text}**\n  - 이유: ${flag.reason}\n  - 권장 수정: ${flag.suggestion}`).join("\n") : "- 별도 확인 후보 없음" },
    { id: "missing", title: "추가 정보", content: bullets(result.missingInformation) },
    ...(result.guidelineReferences.length ? [{ id: "guidelines", title: "반영한 기관 지침", content: bullets(result.guidelineReferences) }] : []),
  ];
}

export function eventPlanSections(result: EventPlanResult): DocumentSection[] {
  const overview = result.overview;
  return [
    { id: "overview", title: "행사 개요", content: table(["항목", "내용"], [["행사명", overview.eventName], ["행사 종류", overview.eventType], ["목적", overview.purpose], ["대상", overview.target], ["일시", overview.dateTime], ["장소", overview.place], ["참여 인원", overview.expectedParticipants], ["담당자", overview.personInCharge], ["운영 방식", overview.operationMethod]]) },
    { id: "objectives", title: "행사 목표", content: bullets(result.objectives) },
    { id: "preparation", title: "사전 준비 일정", content: table(["시기", "준비 내용", "담당", "상태"], result.preparationSchedule.map((item) => [item.timing, item.task, item.personInCharge, item.status])) },
    { id: "program", title: "세부 운영 일정", content: table(["시간", "활동", "운영 내용", "담당", "안전 확인"], result.program.map((item) => [item.time, item.activity, item.details, item.personInCharge, item.safetyCheck])) },
    { id: "roles", title: "역할 분담", content: table(["역할", "업무", "담당"], result.roles.map((item) => [item.role, item.responsibility, item.personInCharge])) },
    { id: "materials", title: "준비물", content: `### 기관 보유 자료\n${bullets(result.materials.available)}\n\n### 새로 준비할 자료\n${bullets(result.materials.toPrepare)}\n\n### 소모품\n${bullets(result.materials.consumables)}\n\n### 안전 관련 물품\n${bullets(result.materials.safety)}\n\n### 기록 관련 물품\n${bullets(result.materials.documentation)}` },
    { id: "safety", title: "안전 계획", content: table(["예상 위험", "예방 조치", "발생 시 대응", "확인 담당"], result.safetyPlan.map((item) => [item.risk, item.prevention, item.response, item.personInCharge])) },
    { id: "parent", title: "학부모 안내 핵심 내용", content: bullets(result.parentCommunicationPoints) },
    { id: "budget", title: "예산 초안", content: `${table(["품목", "수량", "단가", "금액", "예산 과목", "비고"], result.budgetItems.map((item) => [item.item, item.quantity, item.unitPrice === null ? "확인 필요" : formatWon(item.unitPrice), formatWon(calculateBudgetAmount(item)), item.budgetCategory, item.note]))}\n\n**합계는 입력한 수량과 단가만 코드로 계산합니다.**` },
    { id: "checklist", title: "최종 확인 체크리스트", content: checkboxes(result.confirmationChecklist) },
    { id: "review", title: "교사 확인 항목", content: result.reviewFlags.length ? result.reviewFlags.map((flag) => `- **${flag.field}**: ${flag.reason} → ${flag.requiredAction}`).join("\n") : "- 별도 확인 후보 없음" },
    ...(result.guidelineReferences.length ? [{ id: "guidelines", title: "반영한 기관 지침", content: bullets(result.guidelineReferences) }] : []),
  ];
}

export function eventReportSections(result: EventReportResult, input?: EventReportInput): DocumentSection[] {
  const overview = result.overview;
  const planned = input?.plannedBudgetTotal ?? null;
  const actual = input?.actualBudgetTotal ?? null;
  const difference = planned !== null && actual !== null ? actual - planned : null;
  return [
    { id: "overview", title: "행사 개요", content: table(["항목", "계획", "실제"], [["일시", overview.plannedDateTime, overview.actualDateTime], ["장소", overview.plannedPlace, overview.actualPlace], ["참여 인원", overview.plannedParticipants, overview.actualParticipants], ["담당자", "담당자 확인 필요", overview.personInCharge]]) },
    { id: "summary", title: "운영 결과 요약", content: result.implementationSummary },
    { id: "objectives", title: "목표별 결과와 근거", content: table(["계획 목표", "관찰된 근거", "해석", "확인"], result.objectiveResults.map((item) => [item.objective, item.evidence, item.interpretation, item.confirmationRequired ? "확인 필요" : "근거 확인"] )) },
    { id: "responses", title: "유아 반응", content: table(["관찰된 사실", "가능한 의미", "확인"], result.childResponses.map((item) => [item.observedFact, item.possibleMeaning, item.confirmationRequired ? "확인 필요" : "근거 확인"])) },
    { id: "comparison", title: "계획과 실제 운영의 차이", content: table(["계획", "실제", "변경 이유", "다음 반영"], result.changes.map((item) => [item.planned, item.actual, item.reason, item.nextAction])) },
    { id: "safety", title: "안전 및 특이사항", content: bullets(result.safetyAndIncidents) },
    { id: "budget", title: "예산 집행 요약", content: table(["계획 금액", "집행 금액", "차액", "확인"], [[formatWon(planned), formatWon(actual), difference === null ? "확인 필요" : formatWon(difference), input?.budgetReason || "증빙자료 대조 필요"]]) },
    { id: "strengths", title: "잘된 점", content: result.strengths.map((item) => `- **${item.point}**\n  - 근거: ${item.evidence}`).join("\n") || "- 구체적인 근거가 더 필요합니다." },
    { id: "improvements", title: "문제점과 개선점", content: table(["영역", "문제점", "개선점"], result.issuesAndImprovements.map((item) => [item.area, item.issue, item.improvement])) },
    { id: "followup", title: "후속 활동", content: bullets(result.followUpActions) },
    { id: "attachments", title: "첨부자료 체크리스트", content: checkboxes(result.attachmentChecklist) },
    { id: "review", title: "교사 확인 항목", content: result.reviewFlags.map((flag) => `- **${flag.field}**: ${flag.reason} → ${flag.requiredAction}`).join("\n") || "- 별도 확인 후보 없음" },
    ...(result.guidelineReferences.length ? [{ id: "guidelines", title: "반영한 기관 지침", content: bullets(result.guidelineReferences) }] : []),
  ];
}

export function parentNoticeSections(result: ParentNoticeResult): DocumentSection[] {
  return [
    { id: "greeting", title: "인사말", content: result.greeting },
    { id: "body", title: "안내 내용", content: result.body.join("\n\n") },
    { id: "details", title: "행사 핵심 정보", content: table(["항목", "내용"], result.keyDetails.map((item) => [item.label, item.value])) },
    { id: "requests", title: "가정에 부탁드릴 내용", content: bullets(result.requests) },
    { id: "closing", title: "맺음말", content: result.closing },
    { id: "review", title: "발송 전 확인", content: result.reviewFlags.map((flag) => `- **${flag.field}**: ${flag.reason} → ${flag.requiredAction}`).join("\n") || "- 별도 확인 후보 없음" },
  ];
}

export function approvalSections(input: EventPlanInput, result: EventPlanResult): DocumentSection[] {
  const budget = eventPlanSections(result).find((section) => section.id === "budget")?.content || "";
  return [
    { id: "purpose", title: "품의 목적", content: `${input.eventName} 운영을 위한 준비 및 필요 물품 구매·대여 품의 초안입니다. 최종 결재 전 기관 양식과 예산 과목을 확인해 주세요.` },
    { id: "overview", title: "행사 개요", content: `- 행사명: ${input.eventName}\n- 대상: ${input.target}\n- 일시: ${[input.plannedDate, input.plannedTime].filter(Boolean).join(" ") || "추가 정보 필요"}\n- 장소: ${input.place || "추가 정보 필요"}\n- 담당자: ${input.personInCharge || "담당자 확인 필요"}` },
    { id: "budget", title: "소요 예산", content: budget },
    { id: "confirmation", title: "결재 전 확인", content: checkboxes(["예산 과목 확인", "구매처와 단가 확인", "기관 결재 양식 대조", "담당자와 결재선 확인"]) },
  ];
}
