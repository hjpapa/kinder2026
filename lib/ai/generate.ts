import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getOpenAIClient, getTextModel } from "@/lib/ai/client";
import {
  eventPlanInstructions,
  eventReportInstructions,
  observationInstructions,
  parentNoticeInstructions,
  sharedInstructions,
  styleInstructions,
} from "@/lib/ai/prompts";
import {
  eventPlanResultSchema,
  eventReportResultSchema,
  observationResultSchema,
  parentNoticeResultSchema,
  type EventPlanInput,
  type EventReportInput,
  type ObservationInput,
  type ParentNoticeInput,
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
      eventName: input.eventName,
      eventType: input.eventType,
      target: input.target,
      dateTime: [input.plannedDate, input.plannedTime].filter(Boolean).join(" ") || "추가 정보 필요",
      place: input.place || "추가 정보 필요",
      expectedParticipants: input.expectedParticipants || "추가 정보 필요",
      personInCharge: input.personInCharge || "담당자 확인 필요",
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
      eventName: input.eventName,
      target: input.target || "추가 정보 필요",
      plannedDateTime: input.plannedDateTime || "추가 정보 필요",
      actualDateTime: input.actualDateTime || "추가 정보 필요",
      plannedPlace: input.plannedPlace || "추가 정보 필요",
      actualPlace: input.actualPlace || "추가 정보 필요",
      plannedParticipants: input.plannedParticipants || "추가 정보 필요",
      actualParticipants: input.actualParticipants || "추가 정보 필요",
      personInCharge: input.actualPersonInCharge || "담당자 확인 필요",
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
