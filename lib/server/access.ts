import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ACCESS_COOKIE = "teacher-ai-access";

export function isAccessRequired() {
  return Boolean(process.env.APP_ACCESS_CODE);
}

function expectedToken() {
  const code = process.env.APP_ACCESS_CODE;
  if (!code) return "";
  return createHmac("sha256", code).update("teacher-ai-workroom-access-v1").digest("hex");
}

export function createAccessToken() {
  return expectedToken();
}

export function verifyAccessCode(code: string) {
  const expectedCode = process.env.APP_ACCESS_CODE;
  if (!expectedCode) return true;
  const submitted = createHash("sha256").update(code).digest();
  const expected = createHash("sha256").update(expectedCode).digest();
  return timingSafeEqual(submitted, expected);
}

export function hasRequestAccess(request: NextRequest) {
  if (!isAccessRequired()) return true;
  return hasAccessToken(request.cookies.get(ACCESS_COOKIE)?.value || "");
}

export function hasAccessToken(actual: string) {
  if (!isAccessRequired()) return true;
  const expected = expectedToken();
  if (!actual || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export const accessCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 8,
};
