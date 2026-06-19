import { ResolvedImage } from "./types.js";

export function looksLikeUrl(input: string): boolean {
  return input.startsWith("http://") || input.startsWith("https://");
}

export function fromUrl(url: string): ResolvedImage {
  return { kind: "url", url };
}
