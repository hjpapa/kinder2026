"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Camera, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import {
  formatFileSize,
  MAX_RECEIPT_COUNT,
  prepareReceiptImages,
  RECEIPT_ACCEPT,
} from "@/lib/receipt-image";

export function ReceiptUploader({ files, onChange, onError, disabled = false }: {
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [preparing, setPreparing] = useState(false);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  async function selectFiles(list: FileList | null) {
    if (!list?.length) return;
    setPreparing(true);
    onError("");
    try {
      onChange(await prepareReceiptImages(Array.from(list)));
    } catch (error) {
      onError(error instanceof Error ? error.message : "영수증 이미지를 준비하지 못했습니다.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div>
      <label className={`grid min-h-40 cursor-pointer place-items-center rounded-[1.2rem_1.35rem_1.1rem_1.3rem] border-2 border-dashed border-[#adbfaf] bg-white p-5 text-center transition hover:border-[var(--sage)] hover:bg-[var(--sage-soft)] ${disabled || preparing ? "pointer-events-none opacity-60" : ""}`}>
        <span>
          {preparing ? <LoaderCircle className="mx-auto animate-spin text-[var(--sage)]" size={28} aria-hidden="true" /> : <Camera className="mx-auto text-[var(--sage)]" size={28} aria-hidden="true" />}
          <strong className="mt-3 block">{preparing ? "영수증 사진을 작게 만들고 있어요…" : "영수증 사진 선택 또는 촬영"}</strong>
          <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">JPG·PNG·WebP, 최대 {MAX_RECEIPT_COUNT}장 · 전송 전에 장당 700KB 이하로 줄입니다.</span>
        </span>
        <input
          type="file"
          accept={RECEIPT_ACCEPT}
          capture="environment"
          multiple
          disabled={disabled || preparing}
          onChange={(event) => { void selectFiles(event.target.files); event.target.value = ""; }}
          className="sr-only"
          aria-label="영수증 이미지 선택"
        />
      </label>

      {files.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {files.map((file, index) => (
            <article key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white p-3">
              <Image src={previews[index]} alt={`영수증 ${index + 1} 미리보기`} width={64} height={80} unoptimized className="h-20 w-16 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <strong className="block text-sm">영수증 {index + 1}</strong>
                <span className="mt-1 block text-xs text-[var(--muted)]">압축됨 · {formatFileSize(file.size)}</span>
              </div>
              <button type="button" disabled={disabled} onClick={() => onChange(files.filter((_, candidateIndex) => candidateIndex !== index))} className="grid size-11 place-items-center rounded-lg text-[#a0382d] hover:bg-[#fae8e2]" aria-label={`영수증 ${index + 1} 삭제`}><Trash2 size={17} aria-hidden="true" /></button>
            </article>
          ))}
        </div>
      )}

      {!files.length && <p className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]"><ImagePlus size={15} aria-hidden="true" /> 원본 사진은 브라우저 초안이나 서버에 저장하지 않습니다.</p>}
    </div>
  );
}
