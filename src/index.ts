#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { OpenAIProvider } from "./providers/openai.js";
import { makeRecognizeHandler, recognizeSchema } from "./tools/recognize.js";

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

  const server = new McpServer({
    name: "image-recognition-mcp",
    version: "0.1.0",
  });

  server.tool(
    "recognize_image",
    "Recognize and analyze an image using GPT-4o vision. Use this when you cannot see images directly. " +
      "Supports local file paths, http(s) URLs, base64 / data URLs, and \"clipboard\" (latest screenshot).",
    recognizeSchema,
    makeRecognizeHandler(provider),
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
