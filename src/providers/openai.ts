import OpenAI from "openai";
import type { Config } from "../config.js";
import type { ResolvedImage } from "../inputs/types.js";

export interface RecognizeOptions {
  /** What the caller wants to know about the image. */
  prompt: string;
  /** OpenAI vision detail level. "low" is cheaper/faster. */
  detail: "auto" | "low" | "high";
  /** Max tokens for the response. */
  maxTokens?: number;
}

export class OpenAIProvider {
  private client: OpenAI;

  constructor(private config: Config) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeoutMs,
    });
  }

  async recognize(image: ResolvedImage, opts: RecognizeOptions): Promise<string> {
    const imageUrl =
      image.kind === "url"
        ? image.url
        : `data:${image.mimeType};base64,${image.data}`;

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      max_tokens: opts.maxTokens ?? 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: opts.prompt },
            { type: "image_url", image_url: { url: imageUrl, detail: opts.detail } },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response.");
    }
    return content;
  }
}
