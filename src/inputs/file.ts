import { readFile, stat } from "node:fs/promises";
import { existsSync, type Stats } from "node:fs";
import { ResolvedImage } from "./types.js";
import { assertImageSize, mimeTypeForPath, validateImageBytes } from "./image.js";

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

export async function fromFile(path: string): Promise<ResolvedImage> {
  const expanded = path.startsWith("~/")
    ? `${process.env.HOME ?? ""}${path.slice(1)}`
    : path;

  let fileStat: Stats;
  try {
    fileStat = await stat(expanded);
  } catch (err) {
    if (isNodeError(err) && err.code === "ENOENT") {
      throw new Error(`Image file not found: ${path}`);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to read image file metadata for ${path}: ${message}`);
  }
  if (!fileStat.isFile()) {
    throw new Error(`Image path is not a file: ${path}`);
  }

  const mimeType = mimeTypeForPath(expanded);
  assertImageSize(fileStat.size, `Image file ${path}`);

  const data = await readFile(expanded);
  validateImageBytes(data, mimeType, `Image file ${path}`);
  return {
    kind: "base64",
    data: data.toString("base64"),
    mimeType,
  };
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
