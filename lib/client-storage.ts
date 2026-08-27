"use client";

import type { GuidelineSource } from "@/lib/schemas";

export const STORAGE_PREFIX = "teacher-ai-workroom:v1";
const MAX_BACKUP_BYTES = 5_000_000;
const allowedBackupKeys = new Set([
  "settings", "request-stats",
  "observation-drafts", "observation-autosave",
  "event-plan-drafts", "event-plan-autosave",
  "event-report-drafts", "event-report-autosave", "event-report-transfer",
  "parent-notice-drafts", "parent-notice-autosave", "parent-notice-transfer",
]);

export type InstitutionTemplate = {
  id: string;
  name: string;
  tone: string;
  documentTitle: string;
  sectionHeadings: string[];
};

export type AppSettings = {
  institutionTone: string;
  institutionNameDisplay: string;
  autoSave: boolean;
  customDocumentTitle: string;
  customSections: string[];
  selectedTemplateId: string;
  templates: InstitutionTemplate[];
  guidelines: GuidelineSource[];
};

export type StoredDraft<T = unknown> = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: T;
};

export type RequestStats = {
  total: number;
  byKind: Record<string, number>;
  byDate: Record<string, number>;
  lastRequestedAt: string;
};

export const defaultSettings: AppSettings = {
  institutionTone: "따뜻하고 간결한 공문형 문체",
  institutionNameDisplay: "기관명은 직접 입력",
  autoSave: true,
  customDocumentTitle: "",
  customSections: [],
  selectedTemplateId: "default",
  templates: [{ id: "default", name: "누리 기본 양식", tone: "따뜻하고 간결한 공문형 문체", documentTitle: "", sectionHeadings: [] }],
  guidelines: [],
};

function canUseStorage() {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export function readStorage<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  if (!canUseStorage()) return false;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string) {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(`${STORAGE_PREFIX}:${key}`);
}

export function clearWorkroomStorage() {
  if (!canUseStorage()) return;
  const keys = Object.keys(window.localStorage).filter((key) => key.startsWith(`${STORAGE_PREFIX}:`));
  keys.forEach((key) => window.localStorage.removeItem(key));
}

export function getSettings() {
  return normalizeSettings(readStorage<unknown>("settings", defaultSettings));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string, max: number) {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function stringList(value: unknown, maxItems: number, maxLength: number) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, maxLength)).slice(0, maxItems) : [];
}

function normalizeSettings(value: unknown): AppSettings {
  if (!isRecord(value)) return defaultSettings;
  const templates = Array.isArray(value.templates) ? value.templates.flatMap((item): InstitutionTemplate[] => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.name !== "string") return [];
    return [{
      id: item.id.slice(0, 120),
      name: item.id === "default" && item.name === "기본 준비실 양식" ? "누리 기본 양식" : item.name.slice(0, 120),
      tone: stringValue(item.tone, "", 300),
      documentTitle: stringValue(item.documentTitle, "", 120),
      sectionHeadings: stringList(item.sectionHeadings, 8, 80),
    }];
  }).slice(0, 20) : [];
  const safeTemplates = templates.some((template) => template.id === "default") ? templates : [defaultSettings.templates[0], ...templates];
  const guidelines = Array.isArray(value.guidelines) ? value.guidelines.flatMap((item): GuidelineSource[] => {
    if (!isRecord(item) || typeof item.title !== "string" || typeof item.content !== "string") return [];
    return [{ title: item.title.slice(0, 120), content: item.content.slice(0, 4_000) }];
  }).slice(0, 3) : [];
  const selected = stringValue(value.selectedTemplateId, "default", 120);
  return {
    institutionTone: stringValue(value.institutionTone, defaultSettings.institutionTone, 300),
    institutionNameDisplay: stringValue(value.institutionNameDisplay, defaultSettings.institutionNameDisplay, 120),
    autoSave: typeof value.autoSave === "boolean" ? value.autoSave : defaultSettings.autoSave,
    customDocumentTitle: stringValue(value.customDocumentTitle, "", 120),
    customSections: stringList(value.customSections, 8, 80),
    selectedTemplateId: safeTemplates.some((template) => template.id === selected) ? selected : "default",
    templates: safeTemplates,
    guidelines,
  };
}

function normalizeRequestStats(value: unknown): RequestStats {
  if (!isRecord(value)) return { total: 0, byKind: {}, byDate: {}, lastRequestedAt: "" };
  const cleanCounts = (input: unknown) => isRecord(input) ? Object.fromEntries(Object.entries(input).filter(([, count]) => typeof count === "number" && Number.isFinite(count) && count >= 0).map(([key, count]) => [key.slice(0, 40), Math.floor(count as number)])) : {};
  return {
    total: typeof value.total === "number" && Number.isFinite(value.total) && value.total >= 0 ? Math.floor(value.total) : 0,
    byKind: cleanCounts(value.byKind),
    byDate: cleanCounts(value.byDate),
    lastRequestedAt: stringValue(value.lastRequestedAt, "", 40),
  };
}

export function getRequestStats(): RequestStats {
  return normalizeRequestStats(readStorage<unknown>("request-stats", null));
}

export function getSelectedTemplate(settings: AppSettings) {
  return settings.templates.find((template) => template.id === settings.selectedTemplateId) || settings.templates[0] || defaultSettings.templates[0];
}

export function saveDraft<T>(kind: string, name: string, data: T, existingId?: string) {
  const drafts = readStorage<StoredDraft<T>[]>(`${kind}-drafts`, []);
  const now = new Date().toISOString();
  const id = existingId || crypto.randomUUID();
  const next: StoredDraft<T> = { id, name: name || "이름 없는 초안", createdAt: drafts.find((draft) => draft.id === id)?.createdAt || now, updatedAt: now, data };
  const saved = writeStorage(`${kind}-drafts`, [next, ...drafts.filter((draft) => draft.id !== id)].slice(0, 30));
  return saved ? next : null;
}

export function deleteDraft(kind: string, id: string) {
  const drafts = readStorage<StoredDraft[]>(`${kind}-drafts`, []);
  writeStorage(`${kind}-drafts`, drafts.filter((draft) => draft.id !== id));
}

export function incrementRequestStat(kind: string) {
  const stats = getRequestStats();
  const date = new Date().toISOString().slice(0, 10);
  stats.total += 1;
  stats.byKind[kind] = (stats.byKind[kind] || 0) + 1;
  stats.byDate[date] = (stats.byDate[date] || 0) + 1;
  stats.lastRequestedAt = new Date().toISOString();
  writeStorage("request-stats", stats);
}

export function createBackup() {
  if (!canUseStorage()) return "{}";
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(window.localStorage)) {
    if (!key.startsWith(`${STORAGE_PREFIX}:`)) continue;
    const shortKey = key.slice(STORAGE_PREFIX.length + 1);
    if (!allowedBackupKeys.has(shortKey)) continue;
    try {
      data[key] = JSON.parse(window.localStorage.getItem(key) || "null");
    } catch {
      // Ignore invalid stale values instead of exporting them.
    }
  }
  return JSON.stringify({ format: "teacher-ai-workroom-backup", version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

export function restoreBackup(raw: string) {
  if (!canUseStorage()) throw new Error("브라우저 저장소를 사용할 수 없습니다.");
  if (raw.length > MAX_BACKUP_BYTES) throw new Error("백업 파일이 너무 큽니다.");
  const parsed = JSON.parse(raw) as { format?: string; version?: number; data?: Record<string, unknown> };
  if (parsed.format !== "teacher-ai-workroom-backup" || parsed.version !== 1 || !isRecord(parsed.data)) {
    throw new Error("도담비서 백업 파일 형식이 아닙니다.");
  }
  const updates: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(parsed.data)) {
    if (!key.startsWith(`${STORAGE_PREFIX}:`)) throw new Error("다른 앱의 저장 키가 포함되어 있습니다.");
    const shortKey = key.slice(STORAGE_PREFIX.length + 1);
    if (!allowedBackupKeys.has(shortKey)) throw new Error("지원하지 않는 백업 항목이 포함되어 있습니다.");
    const safeValue = shortKey === "settings" ? normalizeSettings(value) : shortKey === "request-stats" ? normalizeRequestStats(value) : value;
    const serialized = JSON.stringify(safeValue);
    if (serialized.length > 1_000_000) throw new Error("백업 항목이 너무 큽니다.");
    updates.push([key, serialized]);
  }
  const previousValues = updates.map(([key]) => [key, window.localStorage.getItem(key)] as const);
  try {
    updates.forEach(([key, serialized]) => window.localStorage.setItem(key, serialized));
  } catch {
    try {
      updates.forEach(([key]) => window.localStorage.removeItem(key));
      previousValues.forEach(([key, previousValue]) => {
        if (previousValue !== null) window.localStorage.setItem(key, previousValue);
      });
    } catch {
      throw new Error("브라우저 저장 공간 오류로 백업 복원 전 상태를 되돌리지 못했습니다.");
    }
    throw new Error("브라우저 저장 공간이 부족해 백업을 복원하지 못했습니다.");
  }
}
