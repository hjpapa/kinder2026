import Link from "next/link";
import { ArrowLeft, NotebookPen } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function ToolShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-10">
        <Link href="/" className="action-button min-h-10 border-transparent bg-transparent px-0 shadow-none no-print hover:bg-transparent"><ArrowLeft size={18} aria-hidden="true" /> 누리 홈</Link>
        <header className="paper-note relative mt-4 max-w-5xl overflow-hidden px-5 py-6 md:px-8 md:py-8">
          <span className="absolute -right-8 -top-12 size-32 rounded-full border-[18px] border-[var(--sage-soft)] opacity-70" aria-hidden="true" />
          <div className="relative flex gap-4 md:gap-5"><span className="mt-1 grid size-11 shrink-0 place-items-center rounded-[1rem_1.15rem_0.9rem_1.1rem] bg-[var(--sun-soft)] text-[#80551a]" aria-hidden="true"><NotebookPen size={21} /></span><div><p className="text-xs font-black tracking-[0.1em] text-[var(--sage)]">누리 홈 / {eyebrow}</p><h1 className="brand-type mt-2 text-3xl font-black leading-tight md:text-[2.6rem]">{title}</h1><p className="mt-3 max-w-[65ch] text-base leading-7 text-[var(--muted)] md:text-lg md:leading-8">{description}</p></div></div>
        </header>
        <div className="mt-6 md:mt-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
