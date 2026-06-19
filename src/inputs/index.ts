import type { ResolvedImage, ResolveImageOptions } from "./types.js";
import { fromFile, looksLikeFilePath } from "./file.js";
import { fromUrl, looksLikeUrl } from "./url.js";
import {
  fromBase64,
  fromDataUrl,
  looksLikeBase64,
  looksLikeDataUrl,
} from "./base64.js";
import { fromClipboard, looksLikeClipboard } from "./clipboard.js";

/**
 * Resolve an arbitrary image input string into a form the vision provider accepts.
 * Order matters: URL → data URL → "clipboard" → existing file → raw base64.
 */
export async function resolveImage(
  input: string,
  options: ResolveImageOptions = {},
): Promise<ResolvedImage> {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Empty image input.");

  if (looksLikeUrl(trimmed)) return fromUrl(trimmed);
  if (looksLikeDataUrl(trimmed)) return fromDataUrl(trimmed);
  if (looksLikeClipboard(trimmed)) return fromClipboard();
  if (looksLikeFilePath(trimmed)) return fromFile(trimmed, options);
  if (looksLikeBase64(trimmed)) return fromBase64(trimmed);

  throw new Error(
    `Unrecognized image input: ${trimmed.slice(0, 60)}\n` +
      "Expected an http(s) URL, local file path, data: URL, base64 string, or \"clipboard\".",
  );
}

export type { ResolvedImage } from "./types.js";
