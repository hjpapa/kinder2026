import type { NextRequest } from "next/server";
import { generateApproval } from "@/lib/ai/generate";
import { approvalInputSchema, type ApprovalResult } from "@/lib/schemas";
import { handleGeneration } from "@/lib/server/generation-handler";

const demoApprovalResult: ApprovalResult = {
  documentTitle: "교실 미술재료 구입 예상 품의서",
  purpose: "유아의 가을 자연물 콜라주 활동에 필요한 미술재료를 준비하고자 합니다.",
  purchaseSummary: "활동에 사용할 색지와 투명테이프를 필요한 수량만큼 구입하는 품의 초안입니다.",
  suggestedItems: [{ item: "색지", quantity: 10, unitPrice: 2_500, budgetCategory: "담당자 확인 필요", vendor: "", note: "가을 자연물 콜라주 활동", confirmationRequired: true }],
  expectedEffects: ["유아가 자연물과 미술재료를 조합해 표현 활동을 이어 갈 수 있습니다."],
  confirmationChecklist: ["수량과 단가를 확인했는가?", "예산 과목을 담당자와 확인했는가?", "기관 결재 양식과 대조했는가?"],
  reviewFlags: [{ field: "예산 과목", reason: "예산 과목이 입력되지 않았습니다.", requiredAction: "기관 담당자에게 적용할 예산 과목을 확인해 주세요." }],
  guidelineReferences: [],
};

export async function POST(request: NextRequest) {
  return handleGeneration(request, {
    kind: "approval",
    schema: approvalInputSchema,
    maxBytes: 50_000,
    demoResult: demoApprovalResult,
    generate: generateApproval,
  });
}
