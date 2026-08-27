import type { NextRequest } from "next/server";
import { generateObservation } from "@/lib/ai/generate";
import { demoObservationResult } from "@/lib/demo-data";
import { observationInputSchema } from "@/lib/schemas";
import { handleGeneration } from "@/lib/server/generation-handler";

export async function POST(request: NextRequest) {
  return handleGeneration(request, {
    kind: "observation",
    schema: observationInputSchema,
    maxBytes: 40_000,
    demoResult: demoObservationResult,
    generate: generateObservation,
  });
}
