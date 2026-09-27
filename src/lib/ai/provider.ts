import type { ZodType } from "zod";

export interface AIGenerateOptions {
  /** Optional system instruction / persona for the model. */
  system?: string;
  /** Roughly caps response length — used for cost control. */
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * Every AI feature in Smart Padhai goes through this interface. Swapping models
 * or vendors means writing one new class and pointing AI_PROVIDER at it —
 * nothing else in the app changes.
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;

  /** Free-form text generation — used by the chat assistant. */
  generateText(prompt: string, options?: AIGenerateOptions): Promise<string>;

  /**
   * Generates JSON matching `schema` and validates it before returning.
   * Throws if the model's output doesn't validate after one retry.
   */
  generateStructured<T>(prompt: string, schema: ZodType<T>, options?: AIGenerateOptions): Promise<T>;
}

export class AIProviderError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "AIProviderError";
  }
}
