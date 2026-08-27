import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function ToolShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl font-bold text-[var(--sage-dark)] no-print"><ArrowLeft size={18} aria-hidden="true" /> 준비실 홈</Link>
        <header className="mt-5 max-w-3xl">
          <p className="text-sm font-extrabold tracking-[0.08em] text-[var(--sage)]">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] md:text-5xl">{title}</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">{description}</p>
        </header>
        <div className="mt-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
