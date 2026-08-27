"use client";

export const MAX_RECEIPT_COUNT = 5;
export const MAX_RECEIPT_BYTES = 700_000;
export const MAX_RECEIPT_TOTAL_BYTES = 3_500_000;
export const MAX_RECEIPT_DIMENSION = 1_800;

export const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isSupportedReceiptMime(type: string) {
  return allowedMimeTypes.has(type.toLowerCase());
}

export function validateReceiptSelection(files: File[]) {
  if (!files.length) throw new Error("영수증 이미지를 1장 이상 선택해 주세요.");
  if (files.length > MAX_RECEIPT_COUNT) throw new Error(`영수증은 한 번에 ${MAX_RECEIPT_COUNT}장까지 올릴 수 있습니다.`);
  const unsupported = files.find((file) => !isSupportedReceiptMime(file.type));
  if (unsupported) throw new Error("영수증은 JPG, PNG, WebP 이미지로 올려 주세요. HEIC와 PDF는 아직 지원하지 않습니다.");
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("영수증 이미지를 압축하지 못했습니다.")), "image/jpeg", quality);
  });
}

async function loadImage(file: File) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw(context: CanvasRenderingContext2D, width: number, height: number) { context.drawImage(bitmap, 0, 0, width, height); },
      close() { bitmap.close(); },
    };
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("영수증 이미지를 읽지 못했습니다."));
      element.src = url;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw(context: CanvasRenderingContext2D, width: number, height: number) { context.drawImage(image, 0, 0, width, height); },
      close() { URL.revokeObjectURL(url); },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export async function prepareReceiptImage(file: File, index: number) {
  if (!isSupportedReceiptMime(file.type)) throw new Error("JPG, PNG, WebP 영수증 이미지만 사용할 수 있습니다.");
  const source = await loadImage(file);
  try {
    if (!source.width || !source.height) throw new Error("영수증 이미지의 크기를 확인하지 못했습니다.");
    const scale = Math.min(1, MAX_RECEIPT_DIMENSION / Math.max(source.width, source.height));
    let width = Math.max(1, Math.round(source.width * scale));
    let height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이 브라우저에서는 이미지 압축을 사용할 수 없습니다.");

    for (let resizeAttempt = 0; resizeAttempt < 3; resizeAttempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      source.draw(context, width, height);
      for (const quality of [0.86, 0.76, 0.66, 0.56, 0.46]) {
        const blob = await canvasBlob(canvas, quality);
        if (blob.size <= MAX_RECEIPT_BYTES) {
          return new File([blob], `receipt-${index + 1}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
        }
      }
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
    }
    throw new Error(`영수증 ${index + 1}번 이미지를 700KB 이하로 줄이지 못했습니다. 사진을 잘라 다시 시도해 주세요.`);
  } finally {
    source.close();
  }
}

export async function prepareReceiptImages(files: File[]) {
  validateReceiptSelection(files);
  const prepared: File[] = [];
  for (let index = 0; index < files.length; index += 1) {
    prepared.push(await prepareReceiptImage(files[index], index));
  }
  const total = prepared.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_RECEIPT_TOTAL_BYTES) throw new Error("영수증 이미지 전체 크기가 3.5MB를 넘습니다. 장수를 줄여 다시 시도해 주세요.");
  return prepared;
}

export function formatFileSize(bytes: number) {
  return bytes < 1_000_000 ? `${Math.ceil(bytes / 1_000)}KB` : `${(bytes / 1_000_000).toFixed(1)}MB`;
}
