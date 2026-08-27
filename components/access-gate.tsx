"use client";

import { FormEvent, useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";

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
      <section className="w-full max-w-md rounded-[2rem] border border-[var(--line)] bg-[var(--paper)] p-7 shadow-[0_20px_60px_rgba(53,72,63,0.15)] md:p-9">
        <span className="grid size-14 place-items-center rounded-2xl bg-[var(--sage-soft)] text-[var(--sage-dark)]"><KeyRound aria-hidden="true" /></span>
        <h1 className="mt-6 text-3xl font-black tracking-[-0.03em]">준비실 접근 확인</h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">연수와 시연 중 AI 요청을 보호하기 위한 간단한 접근 코드입니다. 계정이나 기관별 권한 기능은 아닙니다.</p>
        <form onSubmit={submit} className="mt-7">
          <label htmlFor="access-code" className="text-sm font-bold">접근 코드</label>
          <input id="access-code" type="password" autoComplete="current-password" value={code} onChange={(event) => setCode(event.target.value)} required className="mt-2 min-h-12 w-full rounded-xl border border-[#b8c8be] bg-white px-4" />
          {error && <p className="mt-3 text-sm font-semibold text-[#a0382d]" role="alert">{error}</p>}
          <button disabled={loading} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--sage-dark)] px-5 font-bold text-white disabled:opacity-60">
            {loading && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />} 준비실 들어가기
          </button>
        </form>
        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">접근 코드 원문은 브라우저 저장소에 저장하지 않습니다.</p>
      </section>
    </main>
  );
}
