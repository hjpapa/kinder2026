import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_COOKIE,
  accessCookieOptions,
  createAccessToken,
  hasAccessToken,
  hasRequestAccess,
  isAccessRequired,
  verifyAccessCode,
} from "@/lib/server/access";

function requestWithCookie(value?: string) {
  return {
    cookies: {
      get: vi.fn((name: string) => name === ACCESS_COOKIE && value ? { value } : undefined),
    },
  } as unknown as NextRequest;
}

describe("서버 접근 코드", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("접근 코드가 설정되지 않으면 토큰 없이 접근을 허용한다", () => {
    vi.stubEnv("APP_ACCESS_CODE", "");

    expect(isAccessRequired()).toBe(false);
    expect(verifyAccessCode("어떤 값")).toBe(true);
    expect(hasAccessToken("")).toBe(true);
    expect(hasRequestAccess(requestWithCookie())).toBe(true);
  });

  it("설정된 접근 코드와 서명 토큰만 허용한다", () => {
    vi.stubEnv("APP_ACCESS_CODE", "test-only-access-code");
    const token = createAccessToken();

    expect(isAccessRequired()).toBe(true);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyAccessCode("test-only-access-code")).toBe(true);
    expect(verifyAccessCode("wrong-code")).toBe(false);
    expect(hasAccessToken(token)).toBe(true);
    expect(hasAccessToken("")).toBe(false);
    expect(hasAccessToken("0".repeat(64))).toBe(false);
    expect(hasRequestAccess(requestWithCookie(token))).toBe(true);
    expect(hasRequestAccess(requestWithCookie("0".repeat(64)))).toBe(false);
  });

  it("접근 코드가 바뀌면 이전 토큰을 무효화한다", () => {
    vi.stubEnv("APP_ACCESS_CODE", "first-test-code");
    const oldToken = createAccessToken();
    vi.stubEnv("APP_ACCESS_CODE", "second-test-code");

    expect(createAccessToken()).not.toBe(oldToken);
    expect(hasAccessToken(oldToken)).toBe(false);
  });

  it("쿠키를 HttpOnly, SameSite, 제한된 수명으로 구성한다", () => {
    expect(accessCookieOptions).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  });
});
