import type { Metadata } from "next";
import { SettingsWorkspace } from "@/components/settings-workspace";
import { ToolShell } from "@/components/tool-shell";

export const metadata: Metadata = { title: "누리 설정", description: "기관 문체, 템플릿, 지침 자료와 브라우저 저장을 관리합니다.", openGraph: { images: [] }, twitter: { images: [] } };

export default function SettingsPage() {
  return <ToolShell eyebrow="설정·확장" title="기관의 문체와 양식은 브라우저 안에서" description="기관 문체, 사용자 지정 문서 항목, 지침 자료, 템플릿과 백업을 계정 없이 현재 브라우저에서 관리합니다."><SettingsWorkspace /></ToolShell>;
}
