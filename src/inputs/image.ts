import { extname } from "node:path";

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
} as const;

const SUPPORTED_MIME_TYPES = new Set<string>(Object.values(MIME_BY_EXT));

export function mimeTypeForPath(path: string): string {
  const ext = extname(path).toLowerCase();
  const mimeType = MIME_BY_EXT[ext as keyof typeof MIME_BY_EXT];
  if (!mimeType) {
    throw new Error(
      `Unsupported image file type: ${ext || "(none)"}. ` +
        `Supported extensions: ${Object.keys(MIME_BY_EXT).join(", ")}.`,
    );
  }
  return mimeType;
}

export function assertImageSize(byteLength: number, source: string): void {
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new Error(
      `${source} is too large (${formatBytes(byteLength)}). ` +
        `Maximum supported image size is ${formatBytes(MAX_IMAGE_BYTES)}.`,
    );
  }
}

export function assertSupportedImageMimeType(
  mimeType: string,
  source: string,
): void {
  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    throw new Error(
      `Unsupported image MIME type for ${source}: ${mimeType}. ` +
        `Supported types: ${Array.from(SUPPORTED_MIME_TYPES).join(", ")}.`,
    );
  }
}

export function detectImageMimeType(bytes: Uint8Array): string | undefined {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (hasAscii(bytes, 0, "GIF87a") || hasAscii(bytes, 0, "GIF89a")) {
    return "image/gif";
  }
  if (hasAscii(bytes, 0, "RIFF") && hasAscii(bytes, 8, "WEBP")) {
    return "image/webp";
  }
  if (hasAscii(bytes, 0, "BM")) {
    return "image/bmp";
  }
  return undefined;
}

export function validateImageBytes(
  bytes: Uint8Array,
  mimeType: string,
  source: string,
): void {
  assertSupportedImageMimeType(mimeType, source);
  assertImageSize(bytes.byteLength, source);

  const detectedMimeType = detectImageMimeType(bytes);
  if (!detectedMimeType) {
    throw new Error(`${source} is not a supported image file.`);
  }
  if (detectedMimeType !== mimeType) {
    throw new Error(
      `${source} content type mismatch: expected ${mimeType}, got ${detectedMimeType}.`,
    );
  }
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

function hasAscii(bytes: Uint8Array, offset: number, value: string): boolean {
  if (bytes.length < offset + value.length) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) return false;
  }
  return true;
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
