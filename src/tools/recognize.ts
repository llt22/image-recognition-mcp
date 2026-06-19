import { z } from "zod";
import type { OpenAIProvider } from "../providers/openai.js";
import type { Config } from "../config.js";
import { resolveImage } from "../inputs/index.js";
import { CLIPBOARD_TOKEN } from "../inputs/clipboard.js";

export const DEFAULT_PROMPT = "Describe this image in detail, including any visible text (OCR).";
export const EXTRACT_TEXT_PROMPT =
  "Extract all visible text from this image. Preserve line breaks and code formatting when possible.";
export const DIAGNOSE_ERROR_PROMPT =
  "Analyze this screenshot for error messages, stack traces, terminal output, or UI failure states. Explain the likely cause and actionable next steps.";
const DEFAULT_DETAIL = "auto";

function promptSchema(defaultPrompt: string) {
  return z
    .string()
    .default(defaultPrompt)
    .describe("Question or instruction about the image, e.g. 'What text is on this sign?'");
}

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
  prompt: promptSchema(DEFAULT_PROMPT),
  detail: detailSchema,
  maxTokens: maxTokensSchema,
};

export const clipboardSchema = {
  prompt: promptSchema(DEFAULT_PROMPT),
  detail: detailSchema,
  maxTokens: maxTokensSchema,
};

export const extractClipboardTextSchema = {
  prompt: promptSchema(EXTRACT_TEXT_PROMPT),
  detail: detailSchema,
  maxTokens: maxTokensSchema,
};

export const diagnoseClipboardErrorSchema = {
  prompt: promptSchema(DIAGNOSE_ERROR_PROMPT),
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

type ImageConfig = Pick<Config, "localFileInputEnabled" | "localFileAllowedRoots">;

export function makeRecognizeHandler(provider: OpenAIProvider, config: ImageConfig) {
  return async (args: RecognizeArgs) => {
    return recognize(provider, config, args.image ?? CLIPBOARD_TOKEN, args, DEFAULT_PROMPT);
  };
}

export function makeClipboardHandler(
  provider: OpenAIProvider,
  config: ImageConfig,
  defaultPrompt = DEFAULT_PROMPT,
) {
  return async (args: ClipboardArgs) => {
    return recognize(provider, config, CLIPBOARD_TOKEN, args, defaultPrompt);
  };
}

async function recognize(
  provider: OpenAIProvider,
  config: ImageConfig,
  imageInput: string,
  args: ClipboardArgs,
  defaultPrompt: string,
) {
  try {
    const resolved = await resolveImage(imageInput, {
      localFileInputEnabled: config.localFileInputEnabled,
      localFileAllowedRoots: config.localFileAllowedRoots,
    });
    const result = await provider.recognize(resolved, {
      prompt: args.prompt ?? defaultPrompt,
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
