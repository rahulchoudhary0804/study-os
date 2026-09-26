import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ZodType } from "zod";
import type { AIGenerateOptions, AIProvider } from "./provider";
import { AIProviderError } from "./provider";

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

  async generateText(prompt: string, options?: AIGenerateOptions): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: options?.system,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxOutputTokens ?? 2048,
      },
    });

    try {
      const result = await model.generateContent(prompt);
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
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: options?.system,
      generationConfig: {
        temperature: options?.temperature ?? 0.4,
        maxOutputTokens: options?.maxOutputTokens ?? 4096,
        responseMimeType: "application/json",
      },
    });

    const attempt = async (extra?: string) => {
      const result = await model.generateContent(extra ? `${prompt}\n\n${extra}` : prompt);
      const text = result.response.text();
      const json = JSON.parse(text);
      return schema.parse(json);
    };

    try {
      return await attempt();
    } catch (firstErr) {
      try {
        return await attempt(
          "Your previous response did not match the required JSON shape. Return ONLY valid JSON matching the requested structure, with no markdown fences and no commentary."
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
