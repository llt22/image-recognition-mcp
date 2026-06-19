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

  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Configure it in the mcpServers env or a .env file.",
    );
  }

  const raw = {
    apiKey,
    model: env("OPENAI_MODEL"),
    baseURL: env("OPENAI_BASE_URL"),
    timeoutMs: numberEnv("OPENAI_TIMEOUT_MS"),
    localFileInputEnabled: booleanEnv("LOCAL_FILE_INPUT_ENABLED"),
    localFileAllowedRoots: rootsEnv("LOCAL_FILE_ALLOWED_ROOTS"),
  };

  return configSchema.parse(raw);
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function numberEnv(name: string): number | undefined {
  const value = env(name);
  return value ? Number(value) : undefined;
}

function booleanEnv(name: string): boolean | undefined {
  const value = env(name);
  if (!value) return undefined;
  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(value.toLowerCase())) return false;
  throw new Error(`${name} must be true or false.`);
}

function rootsEnv(name: string): string[] | undefined {
  const value = env(name);
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
