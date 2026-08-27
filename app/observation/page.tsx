import type { Metadata } from "next";
import { ObservationWorkspace } from "@/components/observation-workspace";
import { ToolShell } from "@/components/tool-shell";

export const metadata: Metadata = { title: "놀이 기록 정리", description: "관찰 메모를 객관적 기록, 학부모용 놀이 이야기와 다음 놀이 지원으로 정리합니다.", openGraph: { images: [] }, twitter: { images: [] } };

export default function ObservationPage() {
  return <ToolShell eyebrow="놀이 기록" title="장면 하나만 적으면 기록은 누리가 정리해요" description="짧은 관찰 메모를 익명화해 객관적 기록, 학부모용 이야기와 다음 놀이 지원으로 정리합니다."><ObservationWorkspace /></ToolShell>;
}
