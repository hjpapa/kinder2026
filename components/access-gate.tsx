"use client";

import { FormEvent, useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

type AccessState = { required: boolean; authenticated: boolean };

export function AccessGate({ children, initialState }: { children: React.ReactNode; initialState: AccessState }) {
  const [state, setState] = useState<AccessState>(initialState);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "접근 코드를 확인해 주세요.");
      setCode("");
      setState({ required: true, authenticated: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "접근 코드를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (!state.required || state.authenticated) return children;

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="paper-card w-full max-w-md rounded-[1.9rem_2.1rem_1.8rem_2rem] p-7 pt-9 md:p-9 md:pt-11">
        <div className="flex items-center gap-3"><BrandMark /><span><strong className="brand-type block text-lg">도담비서 : 누리</strong><span className="text-xs text-[var(--muted)]">안전하게 시작하기</span></span></div>
        <span className="mt-7 grid size-12 place-items-center rounded-[1rem_1.15rem_0.9rem_1.1rem] bg-[var(--sage-soft)] text-[var(--sage-dark)]"><KeyRound aria-hidden="true" /></span>
        <h1 className="brand-type mt-5 text-3xl font-black">누리에게 들어가기</h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">연수와 시연 중 AI 요청을 보호하기 위한 간단한 접근 코드입니다. 계정이나 기관별 권한 기능은 아닙니다.</p>
        <form onSubmit={submit} className="mt-7">
          <label htmlFor="access-code" className="text-sm font-bold">접근 코드</label>
          <input id="access-code" type="password" autoComplete="current-password" value={code} onChange={(event) => setCode(event.target.value)} required className="mt-2 min-h-12 w-full rounded-xl border border-[#b8c8be] bg-white px-4" />
          {error && <p className="mt-3 text-sm font-semibold text-[#a0382d]" role="alert">{error}</p>}
          <button disabled={loading} className="primary-button mt-5 w-full justify-center disabled:opacity-60">
            {loading && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />} 도담비서 시작하기
          </button>
        </form>
        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">접근 코드 원문은 브라우저 저장소에 저장하지 않습니다.</p>
      </section>
    </main>
  );
}
