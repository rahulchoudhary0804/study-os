import type { AIProvider } from "./provider";
import { GeminiProvider } from "./gemini-provider";

let cached: AIProvider | null = null;

/**
 * Factory: reads AI_PROVIDER from the environment and returns the matching
 * implementation. Add a new `case` here (and a new provider class) to
 * support OpenAI/Claude/etc — nothing else in the app needs to change.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const providerName = process.env.AI_PROVIDER ?? "gemini";

  switch (providerName) {
    case "gemini":
      cached = new GeminiProvider(
        process.env.GEMINI_API_KEY ?? "",
        process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest"
      );
      break;
    default:
      throw new Error(`Unknown AI_PROVIDER "${providerName}"`);
  }

  return cached;
}

export * from "./provider";
export * from "./schemas";
