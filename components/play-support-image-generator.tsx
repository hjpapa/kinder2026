"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Download, ImageIcon, LoaderCircle } from "lucide-react";
import { TextArea } from "@/components/form-controls";

type ImageResponsePayload = {
  data?: unknown;
  mode?: unknown;
  demoCanvas?: unknown;
  error?: unknown;
  fallbackAvailable?: unknown;
};

type ImageGenerationError = Error & { fallbackAvailable?: boolean };

function parseResponsePayload(raw: string): ImageResponsePayload {
  if (!raw.trim()) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as ImageResponsePayload : {};
  } catch {
    return {};
  }
}

function defaultErrorMessage(status: number) {
  if (status === 429) return "이미지 생성 요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  return "이미지를 만들지 못했습니다.";
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function createDemoImage(title: string, prompt: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 800;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.fillStyle = "#fffaf0";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#dfece3";
  context.beginPath(); context.arc(1020, 120, 220, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#f5d79d";
  context.beginPath(); context.arc(160, 720, 260, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#285243";
  context.font = "bold 58px sans-serif";
  context.fillText(`${title} 놀이 지원자료`, 90, 150);
  context.font = "32px sans-serif";
  context.fillStyle = "#46564f";
  const words = prompt.split(" ");
  let line = "";
  let y = 245;
  for (const word of words) {
    if (context.measureText(`${line} ${word}`).width > 930) { context.fillText(line, 90, y); line = word; y += 52; } else { line = `${line} ${word}`.trim(); }
  }
  context.fillText(line, 90, y);
  context.fillStyle = "#3f705e";
  for (let index = 0; index < 5; index += 1) context.fillRect(90 + index * 150, 590, 95, 95);
  context.font = "24px sans-serif";
  context.fillStyle = "#64726c";
  context.fillText("시연용 샘플 · 실제 환경 구성은 교사가 확인합니다.", 90, 745);
  return canvas.toDataURL("image/png");
}

export function PlaySupportImageGenerator({ playName, age, supportSummary }: { playName: string; age: "만 3세" | "만 4세" | "만 5세"; supportSummary: string }) {
  const [prompt, setPrompt] = useState(`${supportSummary}\n유아가 직접 따라 그리는 활동지가 아니라 교사가 놀이 환경을 구성할 때 참고할 수 있는 자료로 만들어 주세요.`);
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [requestStatus, setRequestStatus] = useState<"idle" | "loading" | "canceling">("idle");
  const [message, setMessage] = useState("");
  const [fallbackAvailable, setFallbackAvailable] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const loading = requestStatus !== "idle";

  useEffect(() => () => {
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  async function generate() {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setRequestStatus("loading");
    setMessage("");
    setFallbackAvailable(false);
    setImageUrl("");

    try {
      const response = await fetch("/api/generate/play-support-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playName, age, prompt }),
        signal: controller.signal,
      });
      const payload = parseResponsePayload(await response.text());
      if (!response.ok) {
        const error = new Error(typeof payload.error === "string" && payload.error.trim() ? payload.error : defaultErrorMessage(response.status)) as ImageGenerationError;
        error.fallbackAvailable = payload.fallbackAvailable === true;
        throw error;
      }

      const isDemo = payload.demoCanvas === true;
      const nextImageUrl = isDemo ? createDemoImage(playName, prompt) : typeof payload.data === "string" && payload.data.trim() ? payload.data : "";
      if (!nextImageUrl) {
        const error = new Error("이미지 서버가 올바른 결과를 보내지 않았습니다.") as ImageGenerationError;
        error.fallbackAvailable = payload.fallbackAvailable === true;
        throw error;
      }
      if (requestId !== requestIdRef.current) return;
      setMode(isDemo || payload.mode === "demo" ? "demo" : "live");
      setImageUrl(nextImageUrl);
      setMessage(isDemo ? "시연용 샘플 이미지를 만들었습니다." : "놀이 지원자료 이미지를 만들었습니다.");
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (isAbortError(error)) {
        setFallbackAvailable(false);
        setMessage("이미지 생성을 취소했습니다.");
      } else {
        setFallbackAvailable(Boolean((error as ImageGenerationError)?.fallbackAvailable));
        setMessage(error instanceof Error ? error.message : "이미지를 만들지 못했습니다.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        controllerRef.current = null;
        setRequestStatus("idle");
      }
    }
  }

  function cancelGeneration() {
    if (!controllerRef.current) return;
    setRequestStatus("canceling");
    setMessage("이미지 생성 요청을 취소하는 중입니다…");
    controllerRef.current.abort();
  }

  function showDemoImage() {
    const nextImageUrl = createDemoImage(playName, prompt);
    setFallbackAvailable(false);
    if (!nextImageUrl) {
      setMessage("시연용 샘플 이미지를 만들지 못했습니다.");
      return;
    }
    setMode("demo");
    setImageUrl(nextImageUrl);
    setMessage("시연용 샘플 이미지를 만들었습니다.");
  }

  return (
    <details className="no-print mt-5 rounded-2xl border border-[var(--line)] bg-white p-5">
      <summary className="cursor-pointer font-black"><span className="inline-flex items-center gap-2"><ImageIcon size={19} aria-hidden="true" /> 놀이 지원자료 이미지 만들기</span></summary>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">유아 사진, 실명, 개인식별정보 없이 환경 구성 참고 이미지만 생성합니다. 생성 이미지는 서버에 저장하지 않습니다.</p>
      <label htmlFor="support-image-prompt" className="mt-4 block text-sm font-bold">이미지 설명</label>
      <TextArea id="support-image-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} />
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={generate} disabled={loading || prompt.trim().length < 10} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--sage-dark)] px-5 font-bold text-white disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : <ImageIcon size={18} aria-hidden="true" />} {requestStatus === "canceling" ? "취소 처리 중…" : requestStatus === "loading" ? "이미지 생성 중…" : "이미지 생성"}</button>
        {loading && <button type="button" onClick={cancelGeneration} disabled={requestStatus === "canceling"} className="action-button disabled:opacity-60">{requestStatus === "canceling" ? "취소 중…" : "취소"}</button>}
        {fallbackAvailable && !loading && <button type="button" onClick={showDemoImage} className="action-button">시연용 샘플 이미지 만들기</button>}
      </div>
      {imageUrl && <div className="mt-5"><span className="mb-2 inline-flex rounded-full bg-[var(--sun-soft)] px-3 py-1 text-xs font-bold">{mode === "demo" ? "시연용 샘플" : "실제 AI 생성"}</span><Image src={imageUrl} alt={`${playName} 놀이 지원자료`} width={1200} height={800} unoptimized className="w-full rounded-2xl border border-[var(--line)]" /><a href={imageUrl} download={`${playName.replace(/\s/g, "_")}_놀이지원.${imageUrl.startsWith("data:image/jpeg") ? "jpg" : "png"}`} className="action-button mt-3"><Download size={17} aria-hidden="true" /> 이미지 다운로드</a></div>}
      <p className="mt-3 text-sm font-semibold text-[var(--sage-dark)]" aria-live="polite">{message}</p>
    </details>
  );
}
