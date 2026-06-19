import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";
import { z } from "zod";

export const configSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().default("gpt-4o-mini"),
  baseURL: z.string().url().optional(),
  timeoutMs: z.number().int().positive().default(60_000),
  localFileInputEnabled: z.boolean().default(true),
  localFileAllowedRoots: z.array(z.string()).default([]),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  loadEnvFile();

  const apiKey = firstEnv("OPENAI_API_KEY", "VISION_API_KEY");
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY or VISION_API_KEY is not set. Configure it in the mcpServers env or a .env file.",
    );
  }

  const raw = {
    apiKey,
    model: firstEnv("OPENAI_MODEL", "VISION_MODEL", "VISION_MODEL_NAME"),
    baseURL: firstEnv("OPENAI_BASE_URL", "VISION_BASE_URL"),
    timeoutMs: numberEnv(
      "OPENAI_TIMEOUT_MS",
      "VISION_TIMEOUT_MS",
      "VISION_REQUEST_TIMEOUT_MS",
    ),
    localFileInputEnabled: booleanEnv("VISION_ENABLE_LOCAL_PATH_INPUT"),
    localFileAllowedRoots: rootsEnv("VISION_ALLOWED_LOCAL_ROOTS"),
  };

  return configSchema.parse(raw);
}

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function numberEnv(...names: string[]): number | undefined {
  const value = firstEnv(...names);
  return value ? Number(value) : undefined;
}

function booleanEnv(name: string): boolean | undefined {
  const value = firstEnv(name);
  if (!value) return undefined;
  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(value.toLowerCase())) return false;
  throw new Error(`${name} must be true or false.`);
}

function rootsEnv(name: string): string[] | undefined {
  const value = firstEnv(name);
  if (!value) return undefined;
  return value
    .split(",")
    .map((root) => root.trim())
    .filter(Boolean);
}

function loadEnvFile(): void {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(moduleDir, "..", ".env");
  if (!existsSync(envPath)) return;

  const result = loadDotEnv({ path: envPath });
  if (result.error) {
    throw new Error(`Failed to load .env file at ${envPath}: ${result.error.message}`);
  }
}
