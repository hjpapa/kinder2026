import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

type Bucket = { minuteStartedAt: number; minuteCount: number; dayStartedAt: number; dayCount: number };

const globalStore = globalThis as typeof globalThis & { __teacherAiRateLimits?: Map<string, Bucket> };
const store = globalStore.__teacherAiRateLimits ?? new Map<string, Bucket>();
globalStore.__teacherAiRateLimits = store;

function requestKey(request: NextRequest) {
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return createHash("sha256").update(raw).digest("hex");
}

export function checkRateLimit(request: NextRequest, kind: string) {
  void kind;
  const now = Date.now();
  if (store.size > 5_000) {
    for (const [storedKey, bucket] of store) {
      if (now - bucket.dayStartedAt >= 86_400_000) store.delete(storedKey);
    }
    while (store.size > 5_000) store.delete(store.keys().next().value as string);
  }
  const key = requestKey(request);
  const current = store.get(key) ?? { minuteStartedAt: now, minuteCount: 0, dayStartedAt: now, dayCount: 0 };

  if (now - current.minuteStartedAt >= 60_000) {
    current.minuteStartedAt = now;
    current.minuteCount = 0;
  }
  if (now - current.dayStartedAt >= 86_400_000) {
    current.dayStartedAt = now;
    current.dayCount = 0;
  }
  if (current.minuteCount >= 5 || current.dayCount >= 100) {
    const retryAfter = current.minuteCount >= 5
      ? Math.max(1, Math.ceil((60_000 - (now - current.minuteStartedAt)) / 1_000))
      : Math.max(1, Math.ceil((86_400_000 - (now - current.dayStartedAt)) / 1_000));
    return { allowed: false, retryAfter };
  }
  current.minuteCount += 1;
  current.dayCount += 1;
  store.set(key, current);
  return { allowed: true, retryAfter: 0 };
}
