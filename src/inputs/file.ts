import { readFile, realpath, stat } from "node:fs/promises";
import { existsSync, type Stats } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import type { ResolvedImage, ResolveImageOptions } from "./types.js";
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

export async function fromFile(
  path: string,
  options: ResolveImageOptions = {},
): Promise<ResolvedImage> {
  if (options.localFileInputEnabled === false) {
    throw new Error(
      "Local image file input is disabled. Use clipboard, URL, or base64 input instead.",
    );
  }

  const expanded = path.startsWith("~/")
    ? (() => {
        const home = process.env.HOME;
        if (!home) throw new Error("Cannot resolve ~ path: HOME environment variable is not set.");
        return `${home}${path.slice(1)}`;
      })()
    : path;
  const absolutePath = resolve(expanded);

  let realFilePath: string;
  try {
    realFilePath = await realpath(absolutePath);
  } catch (err) {
    if (isNodeError(err) && err.code === "ENOENT") {
      throw new Error(`Image file not found: ${path}`);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to resolve image file path for ${path}: ${message}`);
  }

  await assertAllowedLocalPath(realFilePath, options.localFileAllowedRoots ?? []);

  let fileStat: Stats;
  try {
    fileStat = await stat(realFilePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to read image file metadata for ${path}: ${message}`);
  }
  if (!fileStat.isFile()) {
    throw new Error(`Image path is not a file: ${path}`);
  }

  const mimeType = mimeTypeForPath(realFilePath);
  assertImageSize(fileStat.size, `Image file ${path}`);

  const data = await readFile(realFilePath);
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

async function assertAllowedLocalPath(
  filePath: string,
  allowedRoots: string[],
): Promise<void> {
  if (allowedRoots.length === 0 || allowedRoots.includes("*")) return;

  const normalizedRoots = await Promise.all(
    allowedRoots.map((root) => resolveAllowedRoot(root)),
  );
  const isAllowed = normalizedRoots.some((root) => {
    const relativePath = relative(root, filePath);
    return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
  });

  if (!isAllowed) {
    throw new Error(
      `Image file is outside LOCAL_FILE_ALLOWED_ROOTS: ${filePath}`,
    );
  }
}

async function resolveAllowedRoot(root: string): Promise<string> {
  try {
    return await realpath(resolve(expandHome(root)));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid LOCAL_FILE_ALLOWED_ROOTS entry ${root}: ${message}`);
  }
}

function expandHome(path: string): string {
  if (!path.startsWith("~/")) return path;
  const home = process.env.HOME;
  if (!home) throw new Error("Cannot resolve ~ path: HOME environment variable is not set.");
  return `${home}${path.slice(1)}`;
}
