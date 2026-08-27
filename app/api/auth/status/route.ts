import { NextResponse, type NextRequest } from "next/server";
import { hasRequestAccess, isAccessRequired } from "@/lib/server/access";

export async function GET(request: NextRequest) {
  return NextResponse.json({ required: isAccessRequired(), authenticated: hasRequestAccess(request) });
}
