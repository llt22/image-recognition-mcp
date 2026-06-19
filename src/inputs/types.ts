/**
 * A normalized image input ready to send to a vision model.
 * Either as a remote URL (passthrough) or as an inline base64 data URL.
 */
export type ResolvedImage =
  | { kind: "url"; url: string; mimeType?: string }
  | { kind: "base64"; data: string; mimeType: string };

export interface ImageInput {
  /** Raw input from the tool caller: path / http(s) URL / data URL / base64 / "clipboard". */
  raw: string;
}
