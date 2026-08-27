import type { NextRequest } from "next/server";
import { generateEventReport } from "@/lib/ai/generate";
import { demoEventReportResult } from "@/lib/demo-data";
import { eventReportInputSchema } from "@/lib/schemas";
import { handleGeneration } from "@/lib/server/generation-handler";

export async function POST(request: NextRequest) {
  return handleGeneration(request, {
    kind: "event-report",
    schema: eventReportInputSchema,
    maxBytes: 100_000,
    demoResult: demoEventReportResult,
    generate: generateEventReport,
  });
}
