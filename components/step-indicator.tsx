const steps = ["자료 입력", "AI 초안 생성", "교사 확인", "완료"];

export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="no-print flex min-w-max items-center gap-2 text-xs font-bold" aria-label="작업 단계">
      {steps.map((step, index) => (
        <li key={step} className={`flex items-center gap-2 ${index + 1 <= current ? "text-[var(--sage-dark)]" : "text-[#7d8983]"}`} aria-current={index + 1 === current ? "step" : undefined}>
          <span className={`grid size-7 place-items-center rounded-full border ${index + 1 <= current ? "border-[var(--sage)] bg-[var(--sage-soft)]" : "border-[#ccd4cf] bg-white"}`}>{index + 1}</span>
          <span className="sr-only sm:not-sr-only">{step}</span>
          {index < steps.length - 1 && <span className="mx-1 text-[#aab5ae]" aria-hidden="true">→</span>}
        </li>
      ))}
    </ol>
  );
}
