import type { Metadata } from "next";
import { EventReportWorkspace } from "@/components/event-report-workspace";
import { ToolShell } from "@/components/tool-shell";

export const metadata: Metadata = { title: "행사 결과 보고서 작성", description: "계획과 실제 운영을 비교해 근거가 있는 결과와 개선점을 정리합니다.", openGraph: { images: [] }, twitter: { images: [] } };

export default function EventReportPage() {
  return <ToolShell eyebrow="결과 보고" title="계획과 실제를 나란히 놓고 돌아보기" description="저장된 계획서나 기존 문서를 불러온 뒤, 실제 운영 메모와 구체적인 유아 반응을 더해 결과 보고서 초안을 만듭니다."><EventReportWorkspace /></ToolShell>;
}
