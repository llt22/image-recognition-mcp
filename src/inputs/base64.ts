import { ResolvedImage } from "./types.js";
import {
  assertImageSize,
  assertSupportedImageMimeType,
  detectImageMimeType,
  validateImageBytes,
} from "./image.js";

const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export function looksLikeDataUrl(input: string): boolean {
  return DATA_URL_RE.test(input);
}

export function looksLikeBase64(input: string): boolean {
  // Must be reasonably long and match base64 charset (avoid mistaking short words).
  return input.length > 32 && input.length % 4 === 0 && BASE64_RE.test(input);
}

export function fromDataUrl(dataUrl: string): ResolvedImage {
  const m = DATA_URL_RE.exec(dataUrl);
  if (!m) throw new Error(`Invalid data URL: ${dataUrl.slice(0, 40)}...`);
  const mimeType = m[1].toLowerCase();
  const data = m[2];
  assertSupportedImageMimeType(mimeType, "data URL");

  const bytes = decodeBase64Image(data, "data URL");
  validateImageBytes(bytes, mimeType, "data URL");
  return { kind: "base64", data, mimeType };
}

export function fromBase64(b64: string): ResolvedImage {
  const bytes = decodeBase64Image(b64, "base64 input");
  const mimeType = detectImageMimeType(bytes);
  if (!mimeType) {
    throw new Error("base64 input is not a supported image file.");
  }
  validateImageBytes(bytes, mimeType, "base64 input");
  return { kind: "base64", data: b64, mimeType };
}

function decodeBase64Image(b64: string, source: string): Buffer {
  if (!BASE64_RE.test(b64) || b64.length % 4 !== 0) {
    throw new Error(`Invalid base64 image data in ${source}.`);
  }

  assertImageSize(estimateBase64Bytes(b64), source);

  const bytes = Buffer.from(b64, "base64");
  if (bytes.length === 0) {
    throw new Error(`Empty image data in ${source}.`);
  }
  return bytes;
}

function estimateBase64Bytes(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return (b64.length / 4) * 3 - padding;
}
