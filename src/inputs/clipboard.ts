import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ResolvedImage } from "./types.js";

const execFileAsync = promisify(execFile);

export const CLIPBOARD_TOKEN = "clipboard";

export function looksLikeClipboard(input: string): boolean {
  return input.trim().toLowerCase() === CLIPBOARD_TOKEN;
}

async function hasCommand(cmd: string): Promise<boolean> {
  try {
    await execFileAsync("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Grab the most recent image from the system clipboard.
 * macOS: uses `pngpaste` (brew install pngpaste). Returns raw PNG bytes.
 */
export async function fromClipboard(): Promise<ResolvedImage> {
  if (process.platform !== "darwin") {
    throw new Error(
      `Clipboard capture is only implemented for macOS (got ${process.platform}). ` +
        `Provide a file path, URL, or base64 string instead.`,
    );
  }

  if (!(await hasCommand("pngpaste"))) {
    throw new Error(
      "`pngpaste` is not installed. Install it with: brew install pngpaste",
    );
  }

  // pngpaste writes PNG to stdout when given `-`.
  const { stdout } = await execFileAsync("pngpaste", ["-"], {
    maxBuffer: 50 * 1024 * 1024,
    encoding: "buffer",
  });

  if (!stdout || stdout.length === 0) {
    throw new Error(
      "Clipboard does not contain an image. Copy a screenshot first (e.g. Ctrl+Cmd+Shift+4).",
    );
  }

  return {
    kind: "base64",
    data: stdout.toString("base64"),
    mimeType: "image/png",
  };
}
