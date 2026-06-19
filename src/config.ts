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
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  loadEnvFile();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Configure it in the mcpServers env or a .env file.",
    );
  }

  const raw = {
    apiKey,
    model: process.env.OPENAI_MODEL ?? undefined,
    baseURL: process.env.OPENAI_BASE_URL ?? undefined,
    timeoutMs: process.env.OPENAI_TIMEOUT_MS
      ? Number(process.env.OPENAI_TIMEOUT_MS)
      : undefined,
  };

  return configSchema.parse(raw);
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
