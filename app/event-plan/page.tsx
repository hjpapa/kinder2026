import type { Metadata } from "next";
import { EventPlanWorkspace } from "@/components/event-plan-workspace";
import { ToolShell } from "@/components/tool-shell";

export const metadata: Metadata = { title: "행사 계획서 작성", description: "행사 아이디어를 일정, 역할, 준비물, 안전 계획으로 구조화합니다.", openGraph: { images: [] }, twitter: { images: [] } };

export default function EventPlanPage() {
  return <ToolShell eyebrow="행사 계획" title="빈 문서 대신, 알고 있는 정보에서 시작" description="행사 목적과 운영 조건을 입력하면 일정·역할·준비물·안전 계획으로 정리합니다. 모르는 날짜와 금액은 AI가 채우지 않습니다."><EventPlanWorkspace /></ToolShell>;
}
