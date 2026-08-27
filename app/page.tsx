import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardCheck, MessageSquareText, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const tools = [
  {
    href: "/observation",
    eyebrow: "놀이 기록",
    title: "짧은 메모를 단단한 기록으로",
    description: "관찰 메모를 객관적 기록, 학부모용 놀이 이야기, 다음 놀이 지원으로 정리합니다.",
    button: "놀이 기록 시작하기",
    icon: MessageSquareText,
    tone: "bg-[var(--sage-soft)] text-[var(--sage-dark)]",
  },
  {
    href: "/event-plan",
    eyebrow: "행사 계획",
    title: "아이디어를 실행 가능한 계획으로",
    description: "행사 목적, 일정, 역할, 준비물과 안전 계획을 입력한 사실 안에서 구조화합니다.",
    button: "행사 계획 세우기",
    icon: CalendarDays,
    tone: "bg-[var(--sun-soft)] text-[#8a581d]",
  },
  {
    href: "/event-report",
    eyebrow: "결과 보고",
    title: "계획과 실제를 근거 있게 비교",
    description: "계획서와 실제 운영 메모를 비교해 결과, 유아 반응, 다음 개선점을 정리합니다.",
    button: "결과 보고 정리하기",
    icon: ClipboardCheck,
    tone: "bg-[var(--rose-soft)] text-[#8c4d3a]",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-12 pt-14 md:px-8 md:pb-20 md:pt-20">
          <div className="max-w-4xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#bdd4c7] bg-white px-4 py-2 text-sm font-bold text-[var(--sage-dark)]">
              <ShieldCheck size={17} aria-hidden="true" /> AI가 초안을 만들고 교사가 확인합니다
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.12] tracking-[-0.035em] text-balance sm:text-5xl md:text-6xl">
              선생님의 메모가 문서가 되기 전,
              <span className="text-[var(--sage)]"> 잠시 준비실에 들렀습니다.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              관찰은 교사가, 정리는 AI가 돕습니다. 입력하지 않은 사실은 만들지 않고 확인이 필요한 부분은 또렷하게 표시합니다.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <article key={tool.href} className="group flex min-h-[360px] flex-col rounded-[2rem] border border-[var(--line)] bg-[var(--paper)] p-7 shadow-[0_18px_50px_rgba(53,72,63,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(53,72,63,0.13)]">
                  <div className={`grid size-14 place-items-center rounded-2xl ${tool.tone}`} aria-hidden="true">
                    <Icon size={27} />
                  </div>
                  <p className="mt-7 text-sm font-extrabold tracking-[0.08em] text-[var(--sage)]">{tool.eyebrow}</p>
                  <h2 className="mt-3 text-2xl font-black leading-snug tracking-[-0.025em]">{tool.title}</h2>
                  <p className="mt-4 flex-1 leading-7 text-[var(--muted)]">{tool.description}</p>
                  <Link href={tool.href} className="mt-7 inline-flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-[var(--ink)] px-5 font-bold text-white transition group-hover:bg-[var(--sage-dark)]">
                    {tool.button}
                    <ArrowRight size={19} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>

          <aside className="mt-8 flex gap-4 rounded-2xl border border-[#efcf9f] bg-[#fff7e7] p-5 text-sm leading-6 text-[#68491f]">
            <ShieldCheck className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
            <p><strong>전송 전 꼭 확인해 주세요.</strong> 유아의 실명과 민감정보는 입력하지 마세요. 놀이 기록에서는 이름과 연락처 형식을 먼저 익명화해 확인할 수 있습니다.</p>
          </aside>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
