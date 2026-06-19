import { z } from "zod";

export const configSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().default("gpt-4o-mini"),
  baseURL: z.string().url().optional(),
  timeoutMs: z.number().int().positive().default(60_000),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
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
