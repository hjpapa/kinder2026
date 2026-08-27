import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, accessCookieOptions, createAccessToken, verifyAccessCode } from "@/lib/server/access";
import { checkRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(request, "access-code");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "접근 코드 확인이 너무 자주 반복되었습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  try {
    const body = await request.json() as { code?: unknown };
    const code = typeof body.code === "string" ? body.code.slice(0, 200) : "";
    if (!verifyAccessCode(code)) {
      return NextResponse.json({ error: "접근 코드가 맞지 않습니다." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ACCESS_COOKIE, createAccessToken(), accessCookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: "접근 코드를 확인하지 못했습니다." }, { status: 400 });
  }
}
