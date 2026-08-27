import { z } from "zod";

const shortText = z.string().max(300);
const mediumText = z.string().max(4_000);
const longText = z.string().max(15_000);
const outputText = z.string().min(1);

export const guidelineSourceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(4_000),
}).strict();

export const styleContextSchema = z.object({
  institutionTone: z.string().max(300),
  customTitle: z.string().max(120),
  customSections: z.array(z.string().max(80)).max(8),
  templateName: z.string().max(120),
  guidelineSources: z.array(guidelineSourceSchema).max(3),
}).strict();

export const observationInputSchema = z.object({
  age: z.enum(["만 3세", "만 4세", "만 5세"]),
  observationDate: z.string().max(20),
  playName: z.string().trim().min(1).max(120),
  place: shortText,
  childrenCount: shortText.default(""),
  memo: z.string().trim().min(10).max(6_000),
  directQuotes: mediumText,
  curiosity: mediumText,
  resultLength: z.enum(["짧게", "보통", "자세히"]),
  parentTone: z.enum(["따뜻하게", "담백하게"]),
  styleContext: styleContextSchema,
}).strict();

export const budgetItemInputSchema = z.object({
  id: z.string().max(80),
  item: z.string().trim().min(1).max(120),
  quantity: z.number().nonnegative().nullable(),
  unitPrice: z.number().nonnegative().nullable(),
  budgetCategory: z.string().max(120),
  vendor: z.string().max(120),
  note: z.string().max(300),
}).strict();

export const eventPlanInputSchema = z.object({
  eventName: z.string().trim().min(1).max(150),
  eventType: z.string().trim().min(1).max(80),
  target: z.string().trim().min(1).max(200),
  plannedDate: z.string().max(20),
  plannedTime: z.string().max(80),
  place: shortText,
  expectedParticipants: shortText,
  personInCharge: shortText,
  supportStaff: shortText,
  purpose: mediumText,
  childExperience: mediumText,
  curriculumLink: mediumText,
  parentParticipation: mediumText,
  expectedFollowUp: mediumText,
  availableSpaces: mediumText,
  totalTime: shortText,
  preparationTime: shortText,
  purchasing: shortText,
  availableMaterials: mediumText,
  rainPlan: mediumText,
  accessibility: mediumText,
  staffCount: shortText,
  mustInclude: mediumText,
  exclude: mediumText,
  activityIdeas: z.string().trim().min(5).max(8_000),
  budgetItems: z.array(budgetItemInputSchema).max(30),
  styleContext: styleContextSchema,
}).strict();

export const eventReportInputSchema = z.object({
  eventName: z.string().trim().min(1).max(150),
  target: shortText,
  planSource: longText,
  planObjectives: mediumText,
  plannedDateTime: shortText,
  plannedPlace: shortText,
  plannedParticipants: shortText,
  plannedActivities: mediumText,
  plannedRoles: mediumText,
  plannedMaterials: mediumText,
  plannedSafety: mediumText,
  actualDateTime: shortText,
  actualPlace: shortText,
  actualParticipants: shortText,
  actualPersonInCharge: shortText,
  conditions: mediumText,
  cancellationStatus: shortText,
  actualActivities: z.string().trim().min(10).max(10_000),
  sequence: mediumText,
  changes: mediumText,
  changeReasons: mediumText,
  omittedActivities: mediumText,
  addedActivities: mediumText,
  childBehaviors: mediumText,
  childQuotes: mediumText,
  repeatedActivities: mediumText,
  difficulties: mediumText,
  teacherSupport: mediumText,
  safetyIncidents: mediumText,
  safetyReflection: mediumText,
  plannedBudgetTotal: z.number().nonnegative().nullable(),
  actualBudgetTotal: z.number().nonnegative().nullable(),
  budgetReason: mediumText,
  evidenceDocuments: mediumText,
  strengths: mediumText,
  regrets: mediumText,
  nextChanges: mediumText,
  adaptationNotes: mediumText,
  styleContext: styleContextSchema,
}).strict();

const reviewFlagSchema = z.object({
  category: z.enum(["사실 확인", "해석 주의", "개인정보", "추가 정보"]),
  text: outputText,
  reason: outputText,
  suggestion: outputText,
}).strict();

export const observationResultSchema = z.object({
  title: outputText,
  objectiveRecord: outputText,
  parentStory: outputText,
  playSupport: z.object({
    environment: z.array(outputText).min(1),
    materials: z.array(outputText).min(1),
    openQuestions: z.array(outputText).length(3),
    safetyPoints: z.array(outputText).min(1),
    nextObservationPoints: z.array(outputText).min(1),
  }).strict(),
  reviewFlags: z.array(reviewFlagSchema),
  missingInformation: z.array(outputText),
  guidelineReferences: z.array(outputText),
}).strict();

const planReviewFlagSchema = z.object({
  field: outputText,
  reason: outputText,
  requiredAction: outputText,
}).strict();

export const eventPlanResultSchema = z.object({
  documentTitle: outputText,
  overview: z.object({
    eventName: outputText,
    eventType: outputText,
    purpose: outputText,
    target: outputText,
    dateTime: outputText,
    place: outputText,
    expectedParticipants: outputText,
    personInCharge: outputText,
    operationMethod: outputText,
  }).strict(),
  objectives: z.array(outputText).min(2).max(4),
  preparationSchedule: z.array(z.object({
    timing: outputText,
    task: outputText,
    personInCharge: outputText,
    status: z.enum(["미완료", "확인 필요"]),
  }).strict()).min(1),
  program: z.array(z.object({
    time: outputText,
    activity: outputText,
    details: outputText,
    personInCharge: outputText,
    safetyCheck: outputText,
  }).strict()).min(1),
  roles: z.array(z.object({
    role: outputText,
    responsibility: outputText,
    personInCharge: outputText,
  }).strict()).min(1),
  materials: z.object({
    available: z.array(outputText),
    toPrepare: z.array(outputText),
    consumables: z.array(outputText),
    safety: z.array(outputText),
    documentation: z.array(outputText),
  }).strict(),
  safetyPlan: z.array(z.object({
    risk: outputText,
    prevention: outputText,
    response: outputText,
    personInCharge: outputText,
  }).strict()).min(1),
  parentCommunicationPoints: z.array(outputText).min(1),
  budgetItems: z.array(z.object({
    item: outputText,
    quantity: z.number().nonnegative().nullable(),
    unitPrice: z.number().nonnegative().nullable(),
    budgetCategory: outputText,
    note: z.string(),
    confirmationRequired: z.boolean(),
  }).strict()),
  confirmationChecklist: z.array(outputText).min(1),
  reviewFlags: z.array(planReviewFlagSchema),
  guidelineReferences: z.array(outputText),
}).strict();

export const eventReportResultSchema = z.object({
  documentTitle: outputText,
  overview: z.object({
    eventName: outputText,
    plannedDateTime: outputText,
    actualDateTime: outputText,
    plannedPlace: outputText,
    actualPlace: outputText,
    target: outputText,
    plannedParticipants: outputText,
    actualParticipants: outputText,
    personInCharge: outputText,
  }).strict(),
  implementationSummary: outputText,
  objectiveResults: z.array(z.object({
    objective: outputText,
    evidence: outputText,
    interpretation: outputText,
    confirmationRequired: z.boolean(),
  }).strict()).min(1),
  childResponses: z.array(z.object({
    observedFact: outputText,
    possibleMeaning: outputText,
    confirmationRequired: z.boolean(),
  }).strict()).min(1),
  changes: z.array(z.object({
    planned: outputText,
    actual: outputText,
    reason: outputText,
    nextAction: outputText,
  }).strict()).min(1),
  safetyAndIncidents: z.array(outputText).min(1),
  strengths: z.array(z.object({
    point: outputText,
    evidence: outputText,
  }).strict()).min(1),
  issuesAndImprovements: z.array(z.object({
    area: outputText,
    issue: outputText,
    improvement: outputText,
  }).strict()).min(1),
  followUpActions: z.array(outputText).min(1),
  attachmentChecklist: z.array(outputText).min(1),
  reviewFlags: z.array(planReviewFlagSchema),
  guidelineReferences: z.array(outputText),
}).strict();

export const parentNoticeInputSchema = z.object({
  eventName: z.string().trim().min(1).max(150),
  eventSummary: z.string().trim().min(10).max(8_000),
  audience: z.string().max(200),
  tone: z.enum(["따뜻하게", "담백하게", "공식적으로"]),
  confirmedDetails: mediumText,
  styleContext: styleContextSchema,
}).strict();

export const parentNoticeResultSchema = z.object({
  title: outputText,
  greeting: outputText,
  body: z.array(outputText).min(1),
  keyDetails: z.array(z.object({ label: outputText, value: outputText }).strict()).min(1),
  requests: z.array(outputText).min(1),
  closing: outputText,
  reviewFlags: z.array(planReviewFlagSchema),
  guidelineReferences: z.array(outputText),
}).strict();

export const playSupportImageInputSchema = z.object({
  playName: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(10).max(2_000),
  age: z.enum(["만 3세", "만 4세", "만 5세"]),
}).strict();

export type GuidelineSource = z.infer<typeof guidelineSourceSchema>;
export type StyleContext = z.infer<typeof styleContextSchema>;
export type ObservationInput = z.infer<typeof observationInputSchema>;
export type ObservationResult = z.infer<typeof observationResultSchema>;
export type BudgetItemInput = z.infer<typeof budgetItemInputSchema>;
export type EventPlanInput = z.infer<typeof eventPlanInputSchema>;
export type EventPlanResult = z.infer<typeof eventPlanResultSchema>;
export type EventReportInput = z.infer<typeof eventReportInputSchema>;
export type EventReportResult = z.infer<typeof eventReportResultSchema>;
export type ParentNoticeInput = z.infer<typeof parentNoticeInputSchema>;
export type ParentNoticeResult = z.infer<typeof parentNoticeResultSchema>;
