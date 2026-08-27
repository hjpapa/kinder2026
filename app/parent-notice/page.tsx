import type { Metadata } from "next";
import { ParentNoticeWorkspace } from "@/components/parent-notice-workspace";
import { ToolShell } from "@/components/tool-shell";

export const metadata: Metadata = { title: "가정통신문 초안", description: "행사 계획을 학부모가 읽기 쉬운 안내문 초안으로 정리합니다.", openGraph: { images: [] }, twitter: { images: [] } };

export default function ParentNoticePage() {
  return <ToolShell eyebrow="현장 활용" title="알려줄 내용만 적으면 안내문으로" description="핵심 메모에서 확인된 정보만 사용하고, 발송 전에 교사가 볼 항목을 함께 표시합니다."><ParentNoticeWorkspace /></ToolShell>;
}
