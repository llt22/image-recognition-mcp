import { z } from "zod";
import type { OpenAIProvider } from "../providers/openai.js";
import { resolveImage } from "../inputs/index.js";

export const recognizeSchema = {
  image: z
    .string()
    .describe(
      "Image to recognize. Accepts: http(s) URL, local file path, data: URL, " +
        "raw base64 string, or the literal \"clipboard\" (grabs the latest screenshot).",
    ),
  prompt: z
    .string()
    .default("Describe this image in detail, including any visible text (OCR).")
    .describe("Question or instruction about the image, e.g. 'What text is on this sign?'"),
  detail: z
    .enum(["auto", "low", "high"])
    .default("auto")
    .describe("Vision detail level. 'low' is cheaper and faster; 'high' for fine text."),
  maxTokens: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Max tokens for the response. Defaults to 1024."),
};

export type RecognizeArgs = {
  image: string;
  prompt: string;
  detail: "auto" | "low" | "high";
  maxTokens?: number;
};

export function makeRecognizeHandler(provider: OpenAIProvider) {
  return async (args: RecognizeArgs) => {
    try {
      const resolved = await resolveImage(args.image);
      const result = await provider.recognize(resolved, {
        prompt: args.prompt,
        detail: args.detail,
        maxTokens: args.maxTokens,
      });
      return {
        content: [{ type: "text" as const, text: result }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}
