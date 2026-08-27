import type { Metadata } from "next";
import { EventPlanWorkspace } from "@/components/event-plan-workspace";
import { ToolShell } from "@/components/tool-shell";

export const metadata: Metadata = { title: "행사 계획서 작성", description: "행사 아이디어를 일정, 역할, 준비물, 안전 계획으로 구조화합니다.", openGraph: { images: [] }, twitter: { images: [] } };

export default function EventPlanPage() {
  return <ToolShell eyebrow="행사 계획" title="행사 생각을 한 번에 적어 주세요" description="자유로운 메모에서 일정·역할·준비물·안전 계획을 꺼내 정리합니다. 모르는 날짜와 금액은 AI가 채우지 않습니다."><EventPlanWorkspace /></ToolShell>;
}
