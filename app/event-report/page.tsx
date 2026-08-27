import type { Metadata } from "next";
import { EventReportWorkspace } from "@/components/event-report-workspace";
import { ToolShell } from "@/components/tool-shell";

export const metadata: Metadata = { title: "행사 결과 보고서 작성", description: "실제 행사 메모를 사진 공간이 있는 결과 보고서로 정리합니다.", openGraph: { images: [] }, twitter: { images: [] } };

export default function EventReportPage() {
  return <ToolShell eyebrow="결과 보고" title="실제로 진행한 내용만 간단히 보고해요" description="행사 결과 메모를 활동 내용, 유아 반응, 잘된 점과 사진 공간이 있는 결과 보고서 초안으로 정리합니다."><EventReportWorkspace /></ToolShell>;
}
