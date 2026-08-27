import { Buffer } from "node:buffer";
import { NextResponse, type NextRequest } from "next/server";
import { extractReceipts } from "@/lib/ai/generate";
import { isDemoFallbackEnabled, isDemoMode } from "@/lib/ai/client";
import { demoReceiptExtractionResult } from "@/lib/demo-data";
import { settlementContextSchema } from "@/lib/schemas";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_REQUEST_BYTES = 4_000_000;
const MAX_CONTEXT_BYTES = 10_000;
const MAX_RECEIPT_BYTES = 700_000;
const MAX_TOTAL_RECEIPT_BYTES = 3_500_000;
const MAX_RECEIPTS = 5;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function detectedMime(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    return json({ error: "영수증 이미지와 정산 정보를 함께 전송해 주세요.", code: "INVALID_CONTENT_TYPE" }, 415);
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) return json({ error: "영수증 이미지 전체 크기가 너무 큽니다.", code: "INPUT_TOO_LONG" }, 413);

  const limit = checkRateLimit(request, "receipt-extraction");
  if (!limit.allowed) {
    return json({ error: "요청이 너무 빠르게 반복되었습니다. 잠시 후 다시 시도해 주세요.", code: "RATE_LIMITED" }, 429, { "Retry-After": String(limit.retryAfter) });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "영수증 업로드 내용을 읽지 못했습니다.", code: "INVALID_FORM_DATA" }, 400);
  }

  const rawContext = formData.get("context");
  if (typeof rawContext !== "string" || rawContext.length > MAX_CONTEXT_BYTES) {
    return json({ error: "정산 기본 정보를 확인해 주세요.", code: "INVALID_CONTEXT" }, 400);
  }
  let contextValue: unknown;
  try {
    contextValue = JSON.parse(rawContext);
  } catch {
    return json({ error: "정산 기본 정보를 읽지 못했습니다.", code: "INVALID_CONTEXT" }, 400);
  }
  const context = settlementContextSchema.safeParse(contextValue);
  if (!context.success) {
    return json({ error: "영수증 전송 동의와 정산 기본 정보를 확인해 주세요.", code: "VALIDATION_ERROR" }, 400);
  }

  const entries = formData.getAll("receipts");
  const files = entries.filter((entry): entry is File => typeof entry !== "string");
  if (files.length !== entries.length || files.length < 1 || files.length > MAX_RECEIPTS) {
    return json({ error: `영수증 이미지는 1~${MAX_RECEIPTS}장만 올릴 수 있습니다.`, code: "INVALID_FILE_COUNT" }, 400);
  }
  if (files.some((file) => !allowedTypes.has(file.type.toLowerCase()))) {
    return json({ error: "JPG, PNG, WebP 영수증 이미지만 사용할 수 있습니다.", code: "UNSUPPORTED_FILE_TYPE" }, 400);
  }
  if (files.some((file) => file.size < 1 || file.size > MAX_RECEIPT_BYTES)) {
    return json({ error: "각 영수증 이미지는 700KB 이하여야 합니다.", code: "FILE_TOO_LARGE" }, 413);
  }
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_RECEIPT_BYTES) {
    return json({ error: "영수증 이미지 전체 크기는 3.5MB 이하여야 합니다.", code: "INPUT_TOO_LONG" }, 413);
  }
  if (isDemoMode()) return json({ data: demoReceiptExtractionResult, mode: "demo" });

  try {
    const images = await Promise.all(files.map(async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mimeType = detectedMime(bytes);
      if (!mimeType || mimeType !== file.type.toLowerCase()) throw new Error("INVALID_IMAGE_SIGNATURE");
      return { mimeType, base64: Buffer.from(bytes).toString("base64") };
    }));
    const data = await extractReceipts(context.data, images, request.signal);
    return json({ data, mode: "live" });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_IMAGE_SIGNATURE") {
      return json({ error: "파일 확장자와 실제 이미지 형식이 일치하지 않습니다.", code: "INVALID_IMAGE" }, 400);
    }
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 500;
    const code = error instanceof Error ? error.message : "RECEIPT_EXTRACTION_FAILED";
    const message = code === "OPENAI_API_KEY_MISSING"
      ? "서버의 AI 설정을 확인해 주세요."
      : status === 429
        ? "AI 사용량이 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요."
        : code === "RECEIPT_RESULT_INVALID"
          ? "영수증 판독 결과를 확인하지 못했습니다. 더 선명한 사진으로 다시 시도해 주세요."
          : "영수증을 읽지 못했습니다. 사진과 입력 내용은 화면에 유지되어 있습니다.";
    return json({ error: message, code: status === 429 ? "OPENAI_RATE_LIMIT" : "RECEIPT_EXTRACTION_FAILED", fallbackAvailable: isDemoFallbackEnabled() }, status === 429 ? 429 : 502, status === 429 ? { "Retry-After": "60" } : undefined);
  }
}
