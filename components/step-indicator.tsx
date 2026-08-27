import { Check } from "lucide-react";

const steps = ["자료 입력", "AI 초안 생성", "교사 확인", "완료"];

export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div className="no-print w-full">
      <div className="paper-note flex min-w-64 items-center gap-3 px-4 py-3 sm:hidden" aria-hidden="true"><strong className="brand-type text-[var(--sage-dark)]">{current}/4</strong><span className="text-sm font-bold">{steps[current - 1]}</span><span className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-[#dfe4dc]"><span className="block h-full rounded-full bg-[var(--sage)]" style={{ width: `${current * 25}%` }} /></span></div>
      <ol className="sr-only min-w-max items-center gap-2 text-xs font-bold sm:not-sr-only sm:flex" aria-label="작업 단계">
        {steps.map((step, index) => {
          const completed = index + 1 < current;
          const active = index + 1 === current;
          return (
            <li key={step} className={`flex items-center gap-2 ${index + 1 <= current ? "text-[var(--sage-dark)]" : "text-[#7d8983]"}`} aria-current={active ? "step" : undefined}>
              <span className={`grid size-8 place-items-center rounded-[0.7rem_0.85rem_0.65rem_0.8rem] border ${active ? "border-[var(--sage-dark)] bg-[var(--sage-dark)] text-white shadow-[0_2px_0_#cad8cd]" : completed ? "border-[var(--sage)] bg-[var(--sage-soft)]" : "border-[#ccd4cf] bg-[var(--paper)]"}`}>{completed ? <Check size={15} strokeWidth={3} aria-label="완료" /> : index + 1}</span>
              <span>{step}{active && <span className="ml-1 text-[10px] font-black text-[var(--rose)]">현재</span>}</span>
              {index < steps.length - 1 && <span className="mx-1 h-px w-5 bg-[#bcc7bf]" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
