import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-[rgba(49,86,66,0.12)] bg-[rgba(255,253,246,0.8)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-9 text-sm text-[var(--muted)] md:flex-row md:items-start md:justify-between md:px-8">
        <div className="flex items-center gap-3"><BrandMark compact /><div><p className="brand-type font-black text-[var(--ink)]">도담비서 : 누리</p><p className="mt-0.5 text-xs">교사의 생각을 문서로 잇는 AI 업무 도우미</p></div></div>
        <p className="max-w-2xl leading-6 md:text-right">
          누리는 초안 작성을 돕고, 최종 판단은 선생님이 합니다.<br className="hidden md:block" /> 유아의 실명·건강정보·보호자 연락처 등 민감정보는 입력하지 마세요.
        </p>
      </div>
    </footer>
  );
}
