#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { OpenAIProvider } from "./providers/openai.js";
import {
  clipboardSchema,
  DIAGNOSE_ERROR_PROMPT,
  diagnoseClipboardErrorSchema,
  EXTRACT_TEXT_PROMPT,
  extractClipboardTextSchema,
  makeClipboardHandler,
  makeRecognizeHandler,
  recognizeSchema,
} from "./tools/recognize.js";

function readPackageJson(): { version: string } {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(moduleDir, "..", "package.json");
  const raw = readFileSync(pkgPath, "utf-8");
  return JSON.parse(raw) as { version: string };
}

function start() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // MCP servers must not crash silently; emit to stderr so the host surfaces it.
    process.stderr.write(`[image-recognition-mcp] config error: ${message}\n`);
    process.exit(1);
  }

  const provider = new OpenAIProvider(config);

  const pkg = readPackageJson();

  const server = new McpServer({
    name: "clipboard-vision",
    version: pkg.version,
  });

  server.tool(
    "recognize_image",
    "Recognize and analyze an image using the configured vision model. " +
      "If no image is provided, reads the current clipboard image. " +
      "Also supports local file paths, http(s) URLs, base64, data URLs, and the literal \"clipboard\".",
    recognizeSchema,
    makeRecognizeHandler(provider, config),
  );

  server.tool(
    "analyze_clipboard_image",
    "Analyze the current clipboard image or latest screenshot using the configured vision model. " +
      "Use this when the user asks to inspect a screenshot/image but did not provide a path or URL.",
    clipboardSchema,
    makeClipboardHandler(provider, config),
  );

  server.tool(
    "extract_clipboard_text",
    "Extract visible text from the current clipboard image or latest screenshot. " +
      "Use this for OCR, code snippets, logs, forms, tables, or text-heavy screenshots.",
    extractClipboardTextSchema,
    makeClipboardHandler(provider, config, EXTRACT_TEXT_PROMPT),
  );

  server.tool(
    "diagnose_clipboard_error",
    "Diagnose errors shown in the current clipboard screenshot. " +
      "Use this for stack traces, terminal output, failed tests, build errors, or UI failure states.",
    diagnoseClipboardErrorSchema,
    makeClipboardHandler(provider, config, DIAGNOSE_ERROR_PROMPT),
  );

  const transport = new StdioServerTransport();
  server.connect(transport).catch((err) => {
    process.stderr.write(
      `[image-recognition-mcp] failed to start: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}

start();
