import { calculateBudgetAmount, calculateBudgetTotal, formatWon } from "@/lib/budget";
import type { ApprovalInput, ApprovalResult, EventPlanResult, EventReportResult, ObservationResult, ParentNoticeResult, SettlementContext } from "@/lib/schemas";

export type SectionLayout = "prose" | "lead" | "table" | "cards" | "checklist" | "photo-grid";
export type SectionAccent = "sage" | "sun" | "sky" | "clay";
export type PhotoSlot = { id: string; label: string; caption?: string };
export type DocumentSection = {
  id: string;
  title: string;
  content: string;
  layout?: SectionLayout;
  accent?: SectionAccent;
  photoSlots?: PhotoSlot[];
};
export type EditableDocumentState = { sections: DocumentSection[]; reviewed: boolean };

export function parseEditableDocumentState(value: unknown): EditableDocumentState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { sections?: unknown; reviewed?: unknown };
  if (!Array.isArray(candidate.sections) || typeof candidate.reviewed !== "boolean") return null;
  const sections = candidate.sections.filter((section): section is DocumentSection => {
    if (!section || typeof section !== "object") return false;
    const item = section as Partial<DocumentSection>;
    const validLayout = item.layout === undefined || ["prose", "lead", "table", "cards", "checklist", "photo-grid"].includes(item.layout);
    const validAccent = item.accent === undefined || ["sage", "sun", "sky", "clay"].includes(item.accent);
    const validPhotoSlots = item.photoSlots === undefined || (Array.isArray(item.photoSlots) && item.photoSlots.length <= 8 && item.photoSlots.every((slot) => slot && typeof slot.id === "string" && typeof slot.label === "string" && (slot.caption === undefined || typeof slot.caption === "string")));
    return typeof item.id === "string" && typeof item.title === "string" && typeof item.content === "string" && validLayout && validAccent && validPhotoSlots;
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
    { id: "objective", title: "객관적 관찰기록", content: result.objectiveRecord, layout: "lead", accent: "sage" },
    { id: "parent", title: "학부모용 놀이 이야기", content: result.parentStory, layout: "lead", accent: "sun" },
    { id: "support", title: "다음 놀이 지원", content: `### 환경\n${bullets(result.playSupport.environment)}\n\n### 자료\n${bullets(result.playSupport.materials)}\n\n### 열린 질문\n${bullets(result.playSupport.openQuestions)}\n\n### 안전하게 살펴볼 점\n${bullets(result.playSupport.safetyPoints)}\n\n### 다음에 더 관찰할 점\n${bullets(result.playSupport.nextObservationPoints)}`, layout: "cards", accent: "sky" },
    { id: "review", title: "교사 확인", content: result.reviewFlags.length ? result.reviewFlags.map((flag) => `- **${flag.category} — ${flag.text}**\n  - 이유: ${flag.reason}\n  - 권장 수정: ${flag.suggestion}`).join("\n") : "- 별도 확인 후보 없음" },
    { id: "missing", title: "추가 정보", content: bullets(result.missingInformation) },
    ...(result.guidelineReferences.length ? [{ id: "guidelines", title: "반영한 기관 지침", content: bullets(result.guidelineReferences) }] : []),
  ];
}

export function eventPlanSections(result: EventPlanResult): DocumentSection[] {
  const overview = result.overview;
  return [
    { id: "overview", title: "행사 개요", content: table(["항목", "내용"], [["행사명", overview.eventName], ["행사 종류", overview.eventType], ["목적", overview.purpose], ["대상", overview.target], ["일시", overview.dateTime], ["장소", overview.place], ["참여 인원", overview.expectedParticipants], ["담당자", overview.personInCharge], ["운영 방식", overview.operationMethod]]), layout: "table", accent: "sage" },
    { id: "objectives", title: "행사 목표", content: bullets(result.objectives) },
    { id: "preparation", title: "사전 준비 일정", content: table(["시기", "준비 내용", "담당", "상태"], result.preparationSchedule.map((item) => [item.timing, item.task, item.personInCharge, item.status])), layout: "table" },
    { id: "program", title: "세부 운영 일정", content: table(["시간", "활동", "운영 내용", "담당", "안전 확인"], result.program.map((item) => [item.time, item.activity, item.details, item.personInCharge, item.safetyCheck])), layout: "table", accent: "sun" },
    { id: "roles", title: "역할 분담", content: table(["역할", "업무", "담당"], result.roles.map((item) => [item.role, item.responsibility, item.personInCharge])), layout: "table" },
    { id: "materials", title: "준비물", content: `### 기관 보유 자료\n${bullets(result.materials.available)}\n\n### 새로 준비할 자료\n${bullets(result.materials.toPrepare)}\n\n### 소모품\n${bullets(result.materials.consumables)}\n\n### 안전 관련 물품\n${bullets(result.materials.safety)}\n\n### 기록 관련 물품\n${bullets(result.materials.documentation)}`, layout: "cards", accent: "sky" },
    { id: "safety", title: "안전 계획", content: table(["예상 위험", "예방 조치", "발생 시 대응", "확인 담당"], result.safetyPlan.map((item) => [item.risk, item.prevention, item.response, item.personInCharge])), layout: "table" },
    { id: "parent", title: "학부모 안내 핵심 내용", content: bullets(result.parentCommunicationPoints) },
    { id: "budget", title: "예산 초안", content: `${table(["품목", "수량", "단가", "금액", "예산 과목", "비고"], result.budgetItems.map((item) => [item.item, item.quantity, item.unitPrice === null ? "확인 필요" : formatWon(item.unitPrice), formatWon(calculateBudgetAmount(item)), item.budgetCategory, item.note]))}\n\n**합계는 입력한 수량과 단가만 코드로 계산합니다.**`, layout: "table" },
    { id: "checklist", title: "최종 확인 체크리스트", content: checkboxes(result.confirmationChecklist), layout: "checklist" },
    { id: "review", title: "교사 확인 항목", content: result.reviewFlags.length ? result.reviewFlags.map((flag) => `- **${flag.field}**: ${flag.reason} → ${flag.requiredAction}`).join("\n") : "- 별도 확인 후보 없음" },
    ...(result.guidelineReferences.length ? [{ id: "guidelines", title: "반영한 기관 지침", content: bullets(result.guidelineReferences) }] : []),
  ];
}

export function eventReportSections(result: EventReportResult): DocumentSection[] {
  const overview = result.overview;
  return [
    { id: "overview", title: "행사 개요", content: table(["항목", "내용"], [["행사명", overview.eventName], ["일시", overview.dateTime], ["장소", overview.place], ["대상", overview.target], ["참여 인원", overview.participants], ["담당자", overview.personInCharge]]), layout: "table", accent: "sage" },
    { id: "summary", title: "운영 결과 요약", content: result.implementationSummary, layout: "lead", accent: "sun" },
    { id: "activities", title: "주요 활동 내용", content: table(["활동", "운영 내용"], result.activities.map((item) => [item.activity, item.details])), layout: "table" },
    { id: "responses", title: "유아 반응", content: table(["관찰된 사실", "가능한 의미", "확인"], result.childResponses.map((item) => [item.observedFact, item.possibleMeaning, item.confirmationRequired ? "확인 필요" : "근거 확인"])), layout: "table", accent: "sky" },
    { id: "safety", title: "안전 및 특이사항", content: bullets(result.safetyAndIncidents) },
    { id: "strengths", title: "잘된 점", content: result.strengths.map((item) => `- **${item.point}**\n  - 근거: ${item.evidence}`).join("\n") || "- 구체적인 근거가 더 필요합니다.", layout: "cards", accent: "sun" },
    { id: "improvements", title: "개선 및 참고사항", content: table(["영역", "확인된 내용", "다음 참고"], result.issuesAndImprovements.map((item) => [item.area, item.issue, item.improvement])), layout: "table" },
    { id: "followup", title: "후속 활동", content: bullets(result.followUpActions) },
    { id: "photos", title: "행사 사진", content: "사진을 넣은 뒤 아래 설명을 실제 장면에 맞게 수정해 주세요.", layout: "photo-grid", accent: "clay", photoSlots: [
      { id: "overview-photo", label: "행사 전경", caption: "사진 설명 입력" },
      { id: "activity-photo", label: "주요 활동", caption: "사진 설명 입력" },
      { id: "participation-photo", label: "유아 참여 장면", caption: "사진 설명 입력" },
      { id: "materials-photo", label: "자료·결과물", caption: "사진 설명 입력" },
    ] },
    { id: "attachments", title: "첨부자료 체크리스트", content: checkboxes(result.attachmentChecklist), layout: "checklist" },
    { id: "review", title: "교사 확인 항목", content: result.reviewFlags.map((flag) => `- **${flag.field}**: ${flag.reason} → ${flag.requiredAction}`).join("\n") || "- 별도 확인 후보 없음" },
    ...(result.guidelineReferences.length ? [{ id: "guidelines", title: "반영한 기관 지침", content: bullets(result.guidelineReferences) }] : []),
  ];
}

export function parentNoticeSections(result: ParentNoticeResult): DocumentSection[] {
  return [
    { id: "greeting", title: "인사말", content: result.greeting, layout: "lead", accent: "sun" },
    { id: "body", title: "안내 내용", content: result.body.join("\n\n"), layout: "prose" },
    { id: "details", title: "행사 핵심 정보", content: table(["항목", "내용"], result.keyDetails.map((item) => [item.label, item.value])), layout: "table", accent: "sage" },
    { id: "requests", title: "가정에 부탁드릴 내용", content: bullets(result.requests) },
    { id: "closing", title: "맺음말", content: result.closing },
    { id: "review", title: "발송 전 확인", content: result.reviewFlags.map((flag) => `- **${flag.field}**: ${flag.reason} → ${flag.requiredAction}`).join("\n") || "- 별도 확인 후보 없음" },
  ];
}

export function approvalSections(input: ApprovalInput, result: ApprovalResult): DocumentSection[] {
  const total = calculateBudgetTotal(result.suggestedItems);
  return [
    { id: "overview", title: "품의 개요", content: table(["항목", "내용"], [["건명", input.subject], ["사용 예정일", input.plannedDate || "추가 정보 필요"], ["예산 과목", input.budgetCategory || "담당자 확인 필요"]]), layout: "table", accent: "sage" },
    { id: "purpose", title: "품의 목적", content: result.purpose, layout: "lead", accent: "sun" },
    { id: "summary", title: "구매·사용 계획", content: result.purchaseSummary },
    { id: "items", title: "구입 예정 내역", content: `${table(["품목", "수량", "단가", "금액", "예산 과목", "구매처", "비고"], result.suggestedItems.map((item) => [item.item, item.quantity, formatWon(item.unitPrice), formatWon(calculateBudgetAmount(item)), item.budgetCategory || "확인 필요", item.vendor || "확인 필요", item.note]))}\n\n**예상 합계: ${formatWon(total)}**`, layout: "table", accent: "sky" },
    { id: "effects", title: "기대 효과", content: bullets(result.expectedEffects), layout: "cards" },
    { id: "confirmation", title: "결재 전 확인", content: checkboxes(result.confirmationChecklist), layout: "checklist" },
    { id: "review", title: "확인 필요 항목", content: result.reviewFlags.map((flag) => `- **${flag.field}**: ${flag.reason} → ${flag.requiredAction}`).join("\n") || "- 별도 확인 후보 없음" },
    ...(result.guidelineReferences.length ? [{ id: "guidelines", title: "반영한 기관 지침", content: bullets(result.guidelineReferences) }] : []),
  ];
}

export type SettlementReceiptLike = {
  id: string;
  sourceIndex: number;
  merchant: string | null;
  purchaseDate: string | null;
  printedTotal: number | null;
  warnings: string[];
  items: Array<{
    id: string;
    description: string;
    quantity: number | null;
    unitPrice: number | null;
    printedAmount: number | null;
    needsReview: boolean;
  }>;
};

function receiptItemAmount(item: SettlementReceiptLike["items"][number]) {
  if (item.printedAmount !== null) return item.printedAmount;
  return calculateBudgetAmount(item);
}

export function settlementSections(context: SettlementContext, receipts: SettlementReceiptLike[]): DocumentSection[] {
  const items = receipts.flatMap((receipt) => receipt.items.map((item) => ({ receipt, item, amount: receiptItemAmount(item) })));
  const amounts = items.map(({ amount }) => amount);
  const total = amounts.length && amounts.every((amount): amount is number => amount !== null)
    ? amounts.reduce((sum, amount) => sum + amount, 0)
    : null;
  const warnings = receipts.flatMap((receipt) => receipt.warnings.map((warning) => `영수증 ${receipt.sourceIndex}: ${warning}`));
  return [
    { id: "overview", title: "정산 개요", content: table(["항목", "내용"], [["건명", context.subject], ["사용 목적", context.purpose || "추가 정보 필요"], ["예산 과목", context.budgetCategory || "담당자 확인 필요"], ["영수증 수", `${receipts.length}건`]]), layout: "table", accent: "sage" },
    { id: "receipts", title: "영수증별 집행 내역", content: `${table(["영수증", "구매일", "구매처", "품목", "수량", "단가", "금액", "확인"], items.map(({ receipt, item, amount }) => [receipt.sourceIndex, receipt.purchaseDate || "확인 필요", receipt.merchant || "확인 필요", item.description, item.quantity, formatWon(item.unitPrice), formatWon(amount), item.needsReview ? "확인 필요" : "확인됨"]))}\n\n**정산 합계: ${formatWon(total)}**`, layout: "table", accent: "sky" },
    { id: "evidence", title: "첨부 증빙", content: checkboxes(receipts.map((receipt) => `영수증 ${receipt.sourceIndex} 원본 확인 (${receipt.purchaseDate || "날짜 확인 필요"}, ${receipt.merchant || "구매처 확인 필요"})`)), layout: "checklist" },
    ...(warnings.length ? [{ id: "warnings", title: "판독 확인 사항", content: bullets(warnings), accent: "clay" as const }] : []),
    { id: "notes", title: "비고", content: context.notes || "별도 비고 없음" },
    { id: "confirmation", title: "제출 전 확인", content: checkboxes(["영수증 원본과 품목·금액 대조", "예산 과목 확인", "중복·누락 영수증 확인", "기관 정산 양식과 결재선 확인"]), layout: "checklist" },
  ];
}
