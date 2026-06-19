import { z } from "zod";
import type { OpenAIProvider } from "../providers/openai.js";
import { resolveImage } from "../inputs/index.js";
import { CLIPBOARD_TOKEN } from "../inputs/clipboard.js";

const DEFAULT_PROMPT = "Describe this image in detail, including any visible text (OCR).";
const DEFAULT_DETAIL = "auto";

const promptSchema = z
  .string()
  .default(DEFAULT_PROMPT)
  .describe("Question or instruction about the image, e.g. 'What text is on this sign?'");

const detailSchema = z
  .enum(["auto", "low", "high"])
  .default(DEFAULT_DETAIL)
  .describe("Vision detail level. 'low' is cheaper and faster; 'high' for fine text.");

const maxTokensSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .describe("Max tokens for the response. Defaults to 1024.");

export const recognizeSchema = {
  image: z
    .string()
    .default(CLIPBOARD_TOKEN)
    .describe(
      "Image to recognize. Accepts: http(s) URL, local file path, data: URL, " +
        "raw base64 string, or the literal \"clipboard\". Defaults to \"clipboard\".",
    ),
  prompt: promptSchema,
  detail: detailSchema,
  maxTokens: maxTokensSchema,
};

export const clipboardSchema = {
  prompt: promptSchema,
  detail: detailSchema,
  maxTokens: maxTokensSchema,
};

type Detail = "auto" | "low" | "high";

export type RecognizeArgs = {
  image?: string;
  prompt?: string;
  detail?: Detail;
  maxTokens?: number;
};

export type ClipboardArgs = Omit<RecognizeArgs, "image">;

export function makeRecognizeHandler(provider: OpenAIProvider) {
  return async (args: RecognizeArgs) => {
    return recognize(provider, args.image ?? CLIPBOARD_TOKEN, args);
  };
}

export function makeClipboardHandler(provider: OpenAIProvider) {
  return async (args: ClipboardArgs) => {
    return recognize(provider, CLIPBOARD_TOKEN, args);
  };
}

async function recognize(
  provider: OpenAIProvider,
  imageInput: string,
  args: ClipboardArgs,
) {
  try {
    const resolved = await resolveImage(imageInput);
    const result = await provider.recognize(resolved, {
      prompt: args.prompt ?? DEFAULT_PROMPT,
      detail: args.detail ?? DEFAULT_DETAIL,
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
}
