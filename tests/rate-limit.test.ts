import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

type RateLimitGlobal = typeof globalThis & {
  __teacherAiRateLimits?: Map<string, unknown>;
};

function clearRateLimitStore() {
  delete (globalThis as RateLimitGlobal).__teacherAiRateLimits;
}

function requestFrom(ip: string) {
  return {
    headers: new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1` }),
  } as NextRequest;
}

async function loadFreshRateLimiter() {
  clearRateLimitStore();
  vi.resetModules();
  return import("@/lib/server/rate-limit");
}

describe("checkRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
    clearRateLimitStore();
  });

  it("같은 IP의 서로 다른 생성 종류를 하나의 분당 한도로 합산한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T00:00:00.000Z"));
    const { checkRateLimit } = await loadFreshRateLimiter();
    const request = requestFrom("203.0.113.10");

    for (const kind of ["observation", "event-plan", "event-report", "parent-notice", "play-support-image"]) {
      expect(checkRateLimit(request, kind)).toEqual({ allowed: true, retryAfter: 0 });
    }

    expect(checkRateLimit(request, "access-code")).toEqual({ allowed: false, retryAfter: 60 });
    vi.advanceTimersByTime(1_500);
    expect(checkRateLimit(request, "observation")).toEqual({ allowed: false, retryAfter: 59 });
    vi.advanceTimersByTime(58_500);
    expect(checkRateLimit(request, "observation")).toEqual({ allowed: true, retryAfter: 0 });
  });

  it("서로 다른 IP는 독립된 버킷을 사용한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T00:00:00.000Z"));
    const { checkRateLimit } = await loadFreshRateLimiter();
    const first = requestFrom("203.0.113.11");
    const second = requestFrom("203.0.113.12");

    for (let count = 0; count < 5; count += 1) checkRateLimit(first, "observation");

    expect(checkRateLimit(first, "event-plan")).toEqual({ allowed: false, retryAfter: 60 });
    expect(checkRateLimit(second, "event-plan")).toEqual({ allowed: true, retryAfter: 0 });
  });

  it("일일 한도에 도달하면 남은 하루를 Retry-After로 계산한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T00:00:00.000Z"));
    const { checkRateLimit } = await loadFreshRateLimiter();
    const request = requestFrom("203.0.113.13");

    for (let minute = 0; minute < 20; minute += 1) {
      for (let count = 0; count < 5; count += 1) {
        expect(checkRateLimit(request, `kind-${count}`).allowed).toBe(true);
      }
      vi.advanceTimersByTime(60_000);
    }

    expect(checkRateLimit(request, "observation")).toEqual({ allowed: false, retryAfter: 85_200 });
  });
});
