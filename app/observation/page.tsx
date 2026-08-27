import type { Metadata } from "next";
import { ObservationWorkspace } from "@/components/observation-workspace";
import { ToolShell } from "@/components/tool-shell";

export const metadata: Metadata = { title: "놀이 기록 정리", description: "관찰 메모를 객관적 기록, 학부모용 놀이 이야기와 다음 놀이 지원으로 정리합니다.", openGraph: { images: [] }, twitter: { images: [] } };

export default function ObservationPage() {
  return <ToolShell eyebrow="놀이 기록" title="관찰한 장면을 목적에 맞는 문서로" description="브라우저에서 먼저 익명화한 뒤, 입력된 행동과 발화 안에서만 AI 초안을 만듭니다."><ObservationWorkspace /></ToolShell>;
}
