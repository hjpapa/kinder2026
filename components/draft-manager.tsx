"use client";

import { useCallback, useEffect, useState } from "react";
import { FileClock, Save, Trash2 } from "lucide-react";
import { deleteDraft, readStorage, saveDraft, type StoredDraft } from "@/lib/client-storage";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStoredDraft<T>(value: unknown): value is StoredDraft<T> {
  if (!isObject(value)) return false;
  return typeof value.id === "string" && typeof value.name === "string" && typeof value.createdAt === "string" && typeof value.updatedAt === "string" && isObject(value.data);
}

export function DraftManager<T>({ kind, suggestedName, data, onLoad }: { kind: string; suggestedName: string; data: T; onLoad: (data: T) => void }) {
  const [drafts, setDrafts] = useState<StoredDraft<T>[]>([]);
  const [autoSaved, setAutoSaved] = useState<T | null>(null);
  const [message, setMessage] = useState("");
  const refresh = useCallback(() => {
    const storedDrafts = readStorage<unknown>(`${kind}-drafts`, []);
    const storedAutoSave = readStorage<unknown>(`${kind}-autosave`, null);
    setDrafts(Array.isArray(storedDrafts) ? storedDrafts.filter((draft): draft is StoredDraft<T> => isStoredDraft<T>(draft)).slice(0, 30) : []);
    setAutoSaved(isObject(storedAutoSave) ? storedAutoSave as T : null);
  }, [kind]);
  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return (
    <details className="no-print rounded-2xl border border-[var(--line)] bg-white p-4">
      <summary className="cursor-pointer font-bold"><span className="inline-flex items-center gap-2"><FileClock size={18} aria-hidden="true" /> 여러 초안 관리 ({drafts.length})</span></summary>
      <div className="mt-4">
        <button type="button" onClick={() => {
          const saved = saveDraft(kind, suggestedName, data);
          refresh();
          setMessage(saved ? "현재 내용을 새 초안으로 저장했습니다." : "브라우저 저장 공간 오류로 초안을 저장하지 못했습니다.");
        }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--sage-dark)] px-4 text-sm font-bold text-white"><Save size={17} aria-hidden="true" /> 새 초안 저장</button>
        {autoSaved && <button type="button" onClick={() => { onLoad(autoSaved); setMessage("자동 저장 내용을 불러왔습니다."); }} className="action-button ml-2">자동 저장 불러오기</button>}
        <p className="mt-2 text-xs text-[var(--muted)]">현재 브라우저에만 저장됩니다. 실제 이름 목록과 API 키는 저장하지 않습니다.</p>
        <div className="mt-4 grid gap-2">
          {drafts.map((draft) => (
            <div key={draft.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] p-3 text-sm">
              <button type="button" onClick={() => { onLoad(draft.data); setMessage(`${draft.name} 초안을 불러왔습니다.`); }} className="min-h-11 flex-1 text-left font-semibold hover:text-[var(--sage)]">
                {draft.name}<span className="ml-2 block text-xs font-normal text-[var(--muted)] sm:inline">{new Date(draft.updatedAt).toLocaleString("ko-KR")}</span>
              </button>
              <button type="button" aria-label={`${draft.name} 삭제`} onClick={() => { deleteDraft(kind, draft.id); refresh(); }} className="grid size-11 place-items-center rounded-lg text-[#a0382d] hover:bg-[#fae8e2]"><Trash2 size={17} aria-hidden="true" /></button>
            </div>
          ))}
          {!drafts.length && <p className="text-sm text-[var(--muted)]">저장된 초안이 없습니다.</p>}
        </div>
        <p className="mt-3 text-sm text-[var(--sage-dark)]" aria-live="polite">{message}</p>
      </div>
    </details>
  );
}
