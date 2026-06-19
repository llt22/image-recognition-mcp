import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ResolvedImage } from "./types.js";
import {
  MAX_IMAGE_BYTES,
  assertSupportedImageMimeType,
  validateImageBytes,
} from "./image.js";

const execFileAsync = promisify(execFile);

export const CLIPBOARD_TOKEN = "clipboard";
const CLIPBOARD_COMMAND_TIMEOUT_MS = 10_000;
const CLIPBOARD_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/bmp",
] as const;

export function looksLikeClipboard(input: string): boolean {
  return input.trim().toLowerCase() === CLIPBOARD_TOKEN;
}

async function hasCommand(cmd: string): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      await execFileAsync("where", [cmd], { timeout: CLIPBOARD_COMMAND_TIMEOUT_MS });
    } else {
      await execFileAsync("sh", ["-lc", `command -v ${cmd}`], {
        timeout: CLIPBOARD_COMMAND_TIMEOUT_MS,
      });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Grab the most recent image from the system clipboard.
 * macOS: pngpaste. Windows: PowerShell/.NET clipboard. Linux: wl-paste or xclip.
 */
export async function fromClipboard(): Promise<ResolvedImage> {
  if (process.platform === "darwin") {
    return fromMacClipboard();
  }
  if (process.platform === "win32") {
    return fromWindowsClipboard();
  }
  if (process.platform === "linux") {
    return fromLinuxClipboard();
  }

  throw new Error(
    `Clipboard image capture is not implemented for ${process.platform}. ` +
      `Provide a file path, URL, or base64 string instead.`,
  );
}

async function fromMacClipboard(): Promise<ResolvedImage> {
  if (!(await hasCommand("pngpaste"))) {
    throw new Error(
      "`pngpaste` is not installed. Install it with: brew install pngpaste",
    );
  }

  // pngpaste writes PNG to stdout when given `-`.
  const { stdout } = await execFileAsync("pngpaste", ["-"], {
    maxBuffer: MAX_IMAGE_BYTES,
    encoding: "buffer",
    timeout: CLIPBOARD_COMMAND_TIMEOUT_MS,
  });

  if (!stdout || stdout.length === 0) {
    throw new Error(
      "Clipboard does not contain an image. Copy a screenshot first (e.g. Ctrl+Cmd+Shift+4).",
    );
  }
  return resolvedClipboardImage(stdout, "image/png");
}

async function fromWindowsClipboard(): Promise<ResolvedImage> {
  if (!(await hasCommand("powershell.exe"))) {
    throw new Error(
      "Windows clipboard image capture requires Windows PowerShell (powershell.exe).",
    );
  }

  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$image = [System.Windows.Forms.Clipboard]::GetImage()
if ($null -eq $image) { exit 2 }
$stream = New-Object System.IO.MemoryStream
$image.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
$bytes = $stream.ToArray()
[Console]::OpenStandardOutput().Write($bytes, 0, [int]$bytes.Length)
$stream.Dispose()
$image.Dispose()
`;

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-STA", "-Command", script],
      {
        maxBuffer: MAX_IMAGE_BYTES,
        encoding: "buffer",
        timeout: CLIPBOARD_COMMAND_TIMEOUT_MS,
      },
    );
    if (!stdout || stdout.length === 0) {
      throw new Error("Clipboard does not contain an image.");
    }
    return resolvedClipboardImage(stdout, "image/png");
  } catch (err) {
    if (isExecError(err) && err.code === 2) {
      throw new Error("Clipboard does not contain an image.");
    }
    throw err;
  }
}

async function fromLinuxClipboard(): Promise<ResolvedImage> {
  if (await hasCommand("wl-paste")) {
    const result = await readLinuxClipboardWith(
      "wl-paste",
      (mimeType) => ["--type", mimeType],
    );
    if (result) return result;
  }

  if (await hasCommand("xclip")) {
    const result = await readLinuxClipboardWith(
      "xclip",
      (mimeType) => ["-selection", "clipboard", "-t", mimeType, "-o"],
    );
    if (result) return result;
  }

  throw new Error(
    "Clipboard does not contain a supported image, or no Linux clipboard image tool is available. " +
      "Install wl-clipboard for Wayland (`wl-paste`) or xclip for X11.",
  );
}

async function readLinuxClipboardWith(
  cmd: string,
  argsForMimeType: (mimeType: string) => string[],
): Promise<ResolvedImage | undefined> {
  for (const mimeType of CLIPBOARD_MIME_TYPES) {
    let stdout: Buffer;
    try {
      const result = await execFileAsync(cmd, argsForMimeType(mimeType), {
        maxBuffer: MAX_IMAGE_BYTES,
        encoding: "buffer",
        timeout: CLIPBOARD_COMMAND_TIMEOUT_MS,
      });
      stdout = result.stdout;
    } catch {
      // Try the next advertised image MIME type/tool.
      continue;
    }
    if (stdout.length > 0) {
      return resolvedClipboardImage(stdout, mimeType);
    }
  }
  return undefined;
}

function resolvedClipboardImage(data: Buffer, mimeType: string): ResolvedImage {
  assertSupportedImageMimeType(mimeType, "clipboard image");
  validateImageBytes(data, mimeType, "clipboard image");
  return { kind: "base64", data: data.toString("base64"), mimeType };
}

function isExecError(err: unknown): err is Error & { code?: number | string } {
  return err instanceof Error && "code" in err;
}
