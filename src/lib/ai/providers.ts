// Vercel AI SDK provider glue — SERVER ONLY. Never import this into client code.
//
// BYOK: we construct the provider with the user's own key (or the server env
// fallback) per request. This deliberately bypasses the AI Gateway because the
// product promise is that calls go to the *user's* provider account under
// their own terms (PRD §9, tech-stack §5).

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel, TranscriptionModel } from "ai";
import type { ProviderId } from "../../types";

export interface ProviderCall {
  provider: ProviderId;
  apiKey: string;
  model: string;
}

/** Build a chat/completion language model bound to the caller's key. */
export function getLanguageModel(call: ProviderCall): LanguageModel {
  switch (call.provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey: call.apiKey });
      return openai(call.model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: call.apiKey });
      return anthropic(call.model);
    }
    default: {
      const exhaustive: never = call.provider;
      throw new Error(`Unsupported provider: ${String(exhaustive)}`);
    }
  }
}

/** Build an OpenAI transcription model (Whisper-class) for STT. */
export function getTranscriptionModel(
  apiKey: string,
  model = "whisper-1",
): TranscriptionModel {
  const openai = createOpenAI({ apiKey });
  return openai.transcription(model);
}

/** Default models per provider when the client doesn't specify one. */
export const DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
};

export function isProviderId(value: unknown): value is ProviderId {
  return value === "openai" || value === "anthropic";
}
