import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname } from "node:path";
import { ResolvedImage } from "./types.js";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
};

export function looksLikeFilePath(input: string): boolean {
  if (input.startsWith("http://") || input.startsWith("https://")) return false;
  // Absolute path, or relative path with a dot/extension, or an existing file.
  return (
    input.startsWith("/") ||
    input.startsWith("./") ||
    input.startsWith("~/") ||
    /\.[a-z0-9]{2,5}$/i.test(input) ||
    existsSync(input)
  );
}

export function mimeTypeForPath(path: string): string {
  return MIME_BY_EXT[extname(path).toLowerCase()] ?? "image/png";
}

export async function fromFile(path: string): Promise<ResolvedImage> {
  const expanded = path.startsWith("~/")
    ? `${process.env.HOME ?? ""}${path.slice(1)}`
    : path;

  if (!existsSync(expanded)) {
    throw new Error(`Image file not found: ${path}`);
  }

  const data = await readFile(expanded);
  const mimeType = mimeTypeForPath(expanded);
  return {
    kind: "base64",
    data: data.toString("base64"),
    mimeType,
  };
}
