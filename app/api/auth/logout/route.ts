import { NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/server/access";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
