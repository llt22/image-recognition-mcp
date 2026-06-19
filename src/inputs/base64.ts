import { ResolvedImage } from "./types.js";

const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** Guess a reasonable mime type from a base64 blob's magic bytes. */
function guessMimeFromBase64(b64: string): string {
  const head = b64.slice(0, 8);
  if (head.startsWith("/9j/")) return "image/jpeg";
  if (head.startsWith("iVBOR")) return "image/png";
  if (head.startsWith("R0lGOD")) return "image/gif";
  if (head.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

export function looksLikeDataUrl(input: string): boolean {
  return DATA_URL_RE.test(input);
}

export function looksLikeBase64(input: string): boolean {
  // Must be reasonably long and match base64 charset (avoid mistaking short words).
  return input.length > 32 && BASE64_RE.test(input);
}

export function fromDataUrl(dataUrl: string): ResolvedImage {
  const m = DATA_URL_RE.exec(dataUrl);
  if (!m) throw new Error(`Invalid data URL: ${dataUrl.slice(0, 40)}...`);
  return { kind: "base64", data: m[2], mimeType: m[1] };
}

export function fromBase64(b64: string): ResolvedImage {
  return { kind: "base64", data: b64, mimeType: guessMimeFromBase64(b64) };
}
