import type { NextRequest } from "next/server";
import { generateParentNotice } from "@/lib/ai/generate";
import { demoParentNoticeResult } from "@/lib/demo-data";
import { parentNoticeInputSchema } from "@/lib/schemas";
import { handleGeneration } from "@/lib/server/generation-handler";

export async function POST(request: NextRequest) {
  return handleGeneration(request, {
    kind: "parent-notice",
    schema: parentNoticeInputSchema,
    maxBytes: 60_000,
    demoResult: demoParentNoticeResult,
    generate: generateParentNotice,
  });
}
