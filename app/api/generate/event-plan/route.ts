import type { NextRequest } from "next/server";
import { generateEventPlan } from "@/lib/ai/generate";
import { demoEventPlanResult } from "@/lib/demo-data";
import { eventPlanInputSchema } from "@/lib/schemas";
import { handleGeneration } from "@/lib/server/generation-handler";

export async function POST(request: NextRequest) {
  return handleGeneration(request, {
    kind: "event-plan",
    schema: eventPlanInputSchema,
    maxBytes: 80_000,
    demoResult: demoEventPlanResult,
    generate: generateEventPlan,
  });
}
