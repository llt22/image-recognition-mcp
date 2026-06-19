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
    name: "image-recognition-mcp",
    version: pkg.version,
  });

  server.tool(
    "recognize_image",
    "Recognize and analyze an image using the configured vision model. " +
      "If no image is provided, reads the current clipboard image. " +
      "Also supports local file paths, http(s) URLs, base64, data URLs, and the literal \"clipboard\".",
    recognizeSchema,
    makeRecognizeHandler(provider),
  );

  server.tool(
    "analyze_clipboard_image",
    "Analyze the current clipboard image or latest screenshot using the configured vision model. " +
      "Use this when the user asks to inspect a screenshot/image but did not provide a path or URL.",
    clipboardSchema,
    makeClipboardHandler(provider),
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
