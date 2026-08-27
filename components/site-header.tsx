import Link from "next/link";
import { Sparkles } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--line)] bg-[rgba(255,253,248,0.92)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--sage)] text-white" aria-hidden="true">
            <Sparkles size={21} strokeWidth={2.2} />
          </span>
          <span>
            <strong className="block text-lg leading-tight">교사의 AI 준비실</strong>
            <span className="hidden text-sm text-[var(--muted)] sm:block">놀이 기록부터 행사 계획·결과 보고까지</span>
          </span>
        </Link>
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold hover:border-[var(--sage)]"
        >
          설정
        </Link>
      </div>
    </header>
  );
}
