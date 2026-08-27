import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ClipboardCheck, FileHeart, MessageSquareText, PencilLine, ShieldCheck, Sparkles } from "lucide-react";
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
    number: "01",
    tilt: "lg:-rotate-[0.35deg]",
  },
  {
    href: "/event-plan",
    eyebrow: "행사 계획",
    title: "아이디어를 실행 가능한 계획으로",
    description: "행사 목적, 일정, 역할, 준비물과 안전 계획을 입력한 사실 안에서 구조화합니다.",
    button: "행사 계획 세우기",
    icon: CalendarDays,
    tone: "bg-[var(--sun-soft)] text-[#8a581d]",
    number: "02",
    tilt: "lg:translate-y-3 lg:rotate-[0.3deg]",
  },
  {
    href: "/event-report",
    eyebrow: "결과 보고",
    title: "계획과 실제를 근거 있게 비교",
    description: "계획서와 실제 운영 메모를 비교해 결과, 유아 반응, 다음 개선점을 정리합니다.",
    button: "결과 보고 정리하기",
    icon: ClipboardCheck,
    tone: "bg-[var(--rose-soft)] text-[#8c4d3a]",
    number: "03",
    tilt: "lg:-rotate-[0.25deg]",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-14 pt-10 md:px-8 md:pb-24 md:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.72fr)] lg:gap-16">
            <div className="max-w-4xl">
              <p className="eyebrow-label"><Sparkles size={15} aria-hidden="true" /> 안녕하세요, 누리예요</p>
              <h1 className="brand-type mt-6 max-w-4xl text-4xl font-black leading-[1.13] text-balance sm:text-5xl md:text-[3.7rem]">
                선생님의 생각이 문서가 되기 전,
                <span className="mt-1 block text-[var(--sage-dark)]"><span className="scribble-underline">누리가 차분히</span> 정리할게요.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
                놀이를 읽고 판단하는 일은 선생님이, 흩어진 메모를 문서로 잇는 일은 누리가 돕습니다. 입력하지 않은 사실은 만들지 않아요.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5 text-sm font-bold text-[var(--sage-dark)]">
                {["사실에서 시작", "개인정보 먼저 확인", "마지막은 교사 검토"].map((label) => <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(49,86,66,0.14)] bg-[rgba(255,253,246,0.78)] px-3.5 py-2"><Check size={15} aria-hidden="true" /> {label}</span>)}
              </div>
            </div>

            <aside className="paper-card rounded-[1.8rem_2.1rem_1.7rem_2rem] p-6 pt-8 md:p-8 md:pt-10" aria-label="누리와 문서를 만드는 순서">
              <p className="text-xs font-black tracking-[0.12em] text-[var(--rose)]">오늘의 준비 흐름</p>
              <h2 className="brand-type mt-2 text-2xl font-black">생각은 그대로, 정리만 가볍게</h2>
              <ol className="mt-6 grid gap-4">
                {[{ icon: PencilLine, label: "선생님이 장면을 적어요", note: "짧은 메모도 괜찮아요" }, { icon: Sparkles, label: "누리가 초안을 묶어요", note: "모르는 사실은 채우지 않아요" }, { icon: ClipboardCheck, label: "선생님이 다시 확인해요", note: "수정하고 내보내면 끝" }].map((item, index) => {
                  const Icon = item.icon;
                  return <li key={item.label} className="flex gap-3.5"><span className={`grid size-10 shrink-0 place-items-center rounded-[0.9rem_1rem_0.8rem_1rem] ${index === 0 ? "bg-[var(--sun-soft)] text-[#815516]" : index === 1 ? "bg-[var(--sage-soft)] text-[var(--sage-dark)]" : "bg-[var(--rose-soft)] text-[#8c4d3a]"}`}><Icon size={19} aria-hidden="true" /></span><span><strong className="block text-sm">{item.label}</strong><span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">{item.note}</span></span></li>;
                })}
              </ol>
            </aside>
          </div>

          <div className="mt-14 flex items-end justify-between gap-4 md:mt-20">
            <div><p className="text-xs font-black tracking-[0.12em] text-[var(--sage)]">누리에게 맡길 일</p><h2 className="brand-type mt-2 text-2xl font-black md:text-3xl">오늘은 어떤 문서를 준비할까요?</h2></div>
            <span className="hidden text-sm text-[var(--muted)] md:block">한 번에 하나씩, 선생님의 속도로</span>
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-3 lg:gap-6">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <article key={tool.href} className={`paper-card group flex min-h-[365px] flex-col rounded-[1.8rem_2.1rem_1.7rem_2rem] p-7 transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(53,72,63,0.13)] ${tool.tilt}`}>
                  <div className="flex items-start justify-between gap-4"><div className={`grid size-14 place-items-center rounded-[1.1rem_1.3rem_1rem_1.25rem] ${tool.tone}`} aria-hidden="true"><Icon size={27} /></div><span className="brand-type text-2xl font-black text-[#bec7c0]">{tool.number}</span></div>
                  <p className="mt-7 text-sm font-extrabold tracking-[0.08em] text-[var(--sage)]">{tool.eyebrow}</p>
                  <h2 className="mt-3 text-2xl font-black leading-snug tracking-[-0.025em]">{tool.title}</h2>
                  <p className="mt-4 flex-1 leading-7 text-[var(--muted)]">{tool.description}</p>
                  <Link href={tool.href} className="primary-button mt-7">
                    {tool.button}
                    <ArrowRight size={19} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <aside className="paper-note flex gap-4 bg-[var(--sun-soft)] p-5 text-sm leading-6 text-[#68491f]"><ShieldCheck className="mt-0.5 shrink-0" size={20} aria-hidden="true" /><p><strong>누리가 먼저 알려드려요.</strong> 유아의 실명과 민감정보는 입력하지 마세요. 놀이 기록에서는 이름과 연락처 형식을 전송 전에 확인할 수 있어요.</p></aside>
            <Link href="/parent-notice" className="paper-note group flex items-center justify-between gap-4 bg-[var(--apricot-soft)] p-5"><span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white text-[#9b5b35]"><FileHeart size={20} aria-hidden="true" /></span><span><strong className="block">가정통신문도 함께 준비해요</strong><span className="mt-1 block text-xs text-[var(--muted)]">계획서에서 학부모 안내문으로</span></span></span><ArrowRight className="shrink-0 transition group-hover:translate-x-1" size={19} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
