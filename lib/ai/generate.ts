import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getOpenAIClient, getTextModel } from "@/lib/ai/client";
import {
  approvalInstructions,
  eventPlanInstructions,
  eventReportInstructions,
  observationInstructions,
  parentNoticeInstructions,
  receiptExtractionInstructions,
  sharedInstructions,
  styleInstructions,
} from "@/lib/ai/prompts";
import {
  approvalResultSchema,
  eventPlanResultSchema,
  eventReportResultSchema,
  observationResultSchema,
  parentNoticeResultSchema,
  receiptExtractionResultSchema,
  type ApprovalInput,
  type EventPlanInput,
  type EventReportInput,
  type ObservationInput,
  type ParentNoticeInput,
  type ReceiptExtractionResult,
  type SettlementContext,
} from "@/lib/schemas";

async function parseStructured<T extends z.ZodType>(options: {
  schema: T;
  schemaName: string;
  instructions: string;
  input: unknown;
  signal?: AbortSignal;
}) {
  const client = getOpenAIClient();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await client.responses.parse({
        model: getTextModel(),
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 6_000,
        instructions: `${sharedInstructions}\n\n${options.instructions}`,
        input: JSON.stringify(options.input),
        text: { format: zodTextFormat(options.schema, options.schemaName) },
      }, { signal: options.signal });
      if (!response.output_parsed) {
        if (attempt === 0) continue;
        throw new Error("STRUCTURED_OUTPUT_EMPTY");
      }
      const parsed = options.schema.safeParse(response.output_parsed);
      if (parsed.success) return parsed.data as z.infer<T>;
      if (attempt === 0) continue;
      throw parsed.error;
    } catch (error) {
      if (attempt === 0 && error instanceof z.ZodError) continue;
      throw error;
    }
  }
  throw new Error("STRUCTURED_OUTPUT_INVALID");
}

function validGuidelineReferences(references: string[], titles: string[]) {
  const allowed = new Set(titles.map((title) => title.trim()).filter(Boolean));
  return references.map((reference) => reference.trim()).filter((reference) => allowed.has(reference));
}

export async function generateObservation(input: ObservationInput, signal?: AbortSignal) {
  const result = await parseStructured({
    schema: observationResultSchema,
    schemaName: "observation_result",
    instructions: `${observationInstructions}\n\n${styleInstructions}`,
    input,
    signal,
  });
  return {
    ...result,
    guidelineReferences: validGuidelineReferences(result.guidelineReferences, input.styleContext.guidelineSources.map((source) => source.title)),
  };
}

export async function generateEventPlan(input: EventPlanInput, signal?: AbortSignal) {
  const result = await parseStructured({
    schema: eventPlanResultSchema,
    schemaName: "event_plan_result",
    instructions: `${eventPlanInstructions}\n\n${styleInstructions}`,
    input,
    signal,
  });
  return {
    ...result,
    overview: {
      ...result.overview,
      eventName: input.eventName || result.overview.eventName || "행사명 확인 필요",
      eventType: input.eventType || result.overview.eventType || "행사 종류 확인 필요",
      target: input.target || result.overview.target || "대상 확인 필요",
      dateTime: [input.plannedDate, input.plannedTime].filter(Boolean).join(" ") || result.overview.dateTime || "추가 정보 필요",
      place: input.place || result.overview.place || "추가 정보 필요",
      expectedParticipants: input.expectedParticipants || result.overview.expectedParticipants || "추가 정보 필요",
      personInCharge: input.personInCharge || result.overview.personInCharge || "담당자 확인 필요",
    },
    budgetItems: input.budgetItems.map((item) => ({
      item: item.item,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      budgetCategory: item.budgetCategory || "담당자 확인 필요",
      note: [item.vendor, item.note].filter(Boolean).join(" / "),
      confirmationRequired: item.quantity === null || item.unitPrice === null || !item.budgetCategory,
    })),
    guidelineReferences: validGuidelineReferences(result.guidelineReferences, input.styleContext.guidelineSources.map((source) => source.title)),
  };
}

export async function generateEventReport(input: EventReportInput, signal?: AbortSignal) {
  const result = await parseStructured({
    schema: eventReportResultSchema,
    schemaName: "event_report_result",
    instructions: `${eventReportInstructions}\n\n${styleInstructions}`,
    input,
    signal,
  });
  return {
    ...result,
    overview: {
      ...result.overview,
      eventName: input.eventName || result.overview.eventName || "행사명 확인 필요",
      target: input.target || result.overview.target || "대상 확인 필요",
      dateTime: input.actualDateTime || result.overview.dateTime || "추가 정보 필요",
      place: input.actualPlace || result.overview.place || "추가 정보 필요",
      participants: input.actualParticipants || result.overview.participants || "추가 정보 필요",
      personInCharge: input.actualPersonInCharge || result.overview.personInCharge || "담당자 확인 필요",
    },
    guidelineReferences: validGuidelineReferences(result.guidelineReferences, input.styleContext.guidelineSources.map((source) => source.title)),
  };
}

export async function generateParentNotice(input: ParentNoticeInput, signal?: AbortSignal) {
  const result = await parseStructured({
    schema: parentNoticeResultSchema,
    schemaName: "parent_notice_result",
    instructions: `${parentNoticeInstructions}\n\n${styleInstructions}`,
    input,
    signal,
  });
  return {
    ...result,
    guidelineReferences: validGuidelineReferences(result.guidelineReferences, input.styleContext.guidelineSources.map((source) => source.title)),
  };
}

export async function generateApproval(input: ApprovalInput, signal?: AbortSignal) {
  const result = await parseStructured({
    schema: approvalResultSchema,
    schemaName: "approval_result",
    instructions: `${approvalInstructions}\n\n${styleInstructions}`,
    input,
    signal,
  });
  const explicitItems = input.items.map((item) => ({
    item: item.item,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    budgetCategory: item.budgetCategory || input.budgetCategory,
    vendor: item.vendor,
    note: item.note,
    confirmationRequired: item.quantity === null || item.unitPrice === null || !(item.budgetCategory || input.budgetCategory),
  }));
  return {
    ...result,
    suggestedItems: explicitItems.length ? explicitItems : result.suggestedItems.map((item) => ({
      ...item,
      budgetCategory: item.budgetCategory || input.budgetCategory,
      confirmationRequired: item.confirmationRequired || item.quantity === null || item.unitPrice === null || !(item.budgetCategory || input.budgetCategory),
    })),
    guidelineReferences: validGuidelineReferences(result.guidelineReferences, input.styleContext.guidelineSources.map((source) => source.title)),
  };
}

export async function extractReceipts(
  context: SettlementContext,
  images: Array<{ mimeType: string; base64: string }>,
  signal?: AbortSignal,
): Promise<ReceiptExtractionResult> {
  const client = getOpenAIClient();
  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "original" }
  > = [{
    type: "input_text",
    text: JSON.stringify({ context: { ...context, privacyConfirmed: true }, receiptCount: images.length }),
  }];
  images.forEach((image, index) => {
    content.push({ type: "input_text", text: `영수증 sourceIndex=${index + 1}` });
    content.push({ type: "input_image", image_url: `data:${image.mimeType};base64,${image.base64}`, detail: "original" });
  });

  const response = await client.responses.parse({
    model: getTextModel(),
    store: false,
    reasoning: { effort: "low" },
    max_output_tokens: 4_000,
    instructions: `${sharedInstructions}\n\n${receiptExtractionInstructions}`,
    input: [{ role: "user", content }],
    text: { format: zodTextFormat(receiptExtractionResultSchema, "receipt_extraction_result") },
  }, { signal });
  const parsed = receiptExtractionResultSchema.safeParse(response.output_parsed);
  if (!parsed.success) throw new Error("RECEIPT_RESULT_INVALID");
  const indexes = parsed.data.receipts.map((receipt) => receipt.sourceIndex);
  const expected = images.map((_, index) => index + 1);
  if (indexes.length !== expected.length || new Set(indexes).size !== indexes.length || expected.some((index) => !indexes.includes(index))) {
    throw new Error("RECEIPT_RESULT_INVALID");
  }
  return parsed.data;
}
