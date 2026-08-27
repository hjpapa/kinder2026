export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--paper)]">
      <div className="mx-auto max-w-7xl px-5 py-8 text-sm text-[var(--muted)] md:px-8">
        <p className="font-semibold text-[var(--ink)]">AI는 교실이 아니라 준비실에서 씁니다.</p>
        <p className="mt-2 max-w-3xl leading-6">
          AI가 초안을 만들고, 교사가 사실을 확인하고, 최종 문서를 완성합니다. 유아의 실명·건강정보·보호자 연락처 등 민감정보는 입력하지 마세요.
        </p>
      </div>
    </footer>
  );
}
