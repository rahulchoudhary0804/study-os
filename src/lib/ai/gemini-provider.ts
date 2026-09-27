import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ZodType } from "zod";
import type { AIGenerateOptions, AIProvider } from "./provider";
import { AIProviderError } from "./provider";
import { normalizeAIJson, parseLooseJson } from "./json-repair";

/** Gemini occasionally returns 429/503 under load — one short retry clears most of those. */
function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(429|500|503|overloaded|unavailable|deadline)\b/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly model: string;
  private client: GoogleGenerativeAI;

  constructor(apiKey: string, model = "gemini-flash-lite-latest") {
    if (!apiKey) {
      throw new AIProviderError(
        "GEMINI_API_KEY is not set. Add it to .env.local to enable AI features."
      );
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  private async call(prompt: string, config: Record<string, unknown>, system?: string) {
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: system,
      generationConfig: config,
    });
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      if (!isTransient(err)) throw err;
      await sleep(1200);
      return model.generateContent(prompt);
    }
  }

  async generateText(prompt: string, options?: AIGenerateOptions): Promise<string> {
    try {
      const result = await this.call(
        prompt,
        { temperature: options?.temperature ?? 0.7, maxOutputTokens: options?.maxOutputTokens ?? 2048 },
        options?.system
      );
      return result.response.text();
    } catch (err) {
      throw new AIProviderError("Gemini text generation failed", err);
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: ZodType<T>,
    options?: AIGenerateOptions
  ): Promise<T> {
    const baseTokens = options?.maxOutputTokens ?? 4096;

    const attempt = async (extra: string | undefined, maxOutputTokens: number) => {
      const result = await this.call(
        extra ? `${prompt}\n\n${extra}` : prompt,
        { temperature: options?.temperature ?? 0.4, maxOutputTokens, responseMimeType: "application/json" },
        options?.system
      );
      const text = result.response.text();
      const json = normalizeAIJson(parseLooseJson(text));
      return schema.parse(json);
    };

    try {
      return await attempt(undefined, baseTokens);
    } catch (firstErr) {
      try {
        // A second pass with more room covers truncated responses as well as malformed ones.
        return await attempt(
          "IMPORTANT: Return ONLY valid JSON matching the requested structure — no markdown fences, no commentary. Escape every backslash in LaTeX as \\\\ (e.g. \\\\frac). Omit optional fields instead of writing undefined.",
          Math.min(16000, Math.round(baseTokens * 1.6))
        );
      } catch (secondErr) {
        throw new AIProviderError(
          "Gemini did not return valid structured output after a retry",
          secondErr ?? firstErr
        );
      }
    }
  }
}
