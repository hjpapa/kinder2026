import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(49,86,66,0.12)] bg-[rgba(255,253,246,0.9)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 md:px-8">
        <Link href="/" className="flex min-h-12 items-center gap-3 rounded-xl">
          <BrandMark />
          <span>
            <strong className="brand-type block text-[1.08rem] leading-tight sm:text-xl">도담비서 <span className="text-[var(--rose)]">:</span> 누리</strong>
            <span className="hidden text-xs font-medium text-[var(--muted)] sm:block">교사의 생각을 문서로 잇는 AI 업무 도우미</span>
          </span>
        </Link>
        <Link
          href="/settings"
          className="action-button min-h-11 bg-[var(--paper)] px-3.5"
        >
          <SlidersHorizontal size={17} aria-hidden="true" /> <span className="hidden sm:inline">내 기관</span> 설정
        </Link>
      </div>
    </header>
  );
}
