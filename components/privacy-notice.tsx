import { ShieldAlert } from "lucide-react";

export function PrivacyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`paper-note flex gap-3 border-[#e7c98f] bg-[var(--sun-soft)] text-sm leading-6 text-[#68491f] ${compact ? "p-4" : "p-5"}`}>
      <ShieldAlert className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
      <p><strong>누리가 먼저 알려드려요.</strong> 유아 실명, 건강정보, 보호자 연락처, 상세 주소는 제거하고 AI 초안을 원문과 꼭 비교해 주세요.</p>
    </aside>
  );
}
