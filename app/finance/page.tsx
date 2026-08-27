import type { Metadata } from "next";
import { FinanceWorkspace } from "@/components/finance-workspace";
import { ToolShell } from "@/components/tool-shell";

export const metadata: Metadata = {
  title: "품의서·정산서 작성",
  description: "짧은 구매 메모를 예상 품의서로 정리하고, 영수증 사진에서 항목을 읽어 간단한 정산서를 만듭니다.",
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function FinancePage() {
  return (
    <ToolShell eyebrow="품의·정산" title="구매 메모와 영수증을, 제출하기 쉬운 문서로" description="예상 품의서는 짧은 메모로 시작하고, 정산서는 영수증 사진에서 읽은 값을 선생님이 확인한 뒤 완성합니다. 금액과 예산 과목은 임의로 만들지 않아요.">
      <FinanceWorkspace />
    </ToolShell>
  );
}
