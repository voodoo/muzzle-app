// BYOK credential resolution — SERVER ONLY.
//
// Keys arrive per-request from the user's device via headers (the user's own
// key, held in their browser), or fall back to a server-side env key for the
// optional built-in metered option. Keys are used only here + in providers.ts
// and are NEVER logged or persisted (AGENTS.md hard rules #1, #2, #3).

import type { ProviderId } from "../../types";

const HEADER_KEY = "x-provider-key";
const HEADER_PROVIDER = "x-provider";
const HEADER_OPENAI_KEY = "x-openai-key"; // dedicated key for STT (Whisper)

export interface ResolvedChatCredentials {
  provider: ProviderId;
  apiKey: string;
  model: string;
  /** True when the key came from server env (built-in option), not the user. */
  fromServerEnv: boolean;
}

function envKeyFor(provider: ProviderId): string | undefined {
  return provider === "openai"
    ? import.meta.env.OPENAI_API_KEY
    : import.meta.env.ANTHROPIC_API_KEY;
}

/**
 * Resolve the chat credentials for a request. Prefers the user's per-request
 * BYOK header; falls back to the server env key if present.
 */
export function resolveChatCredentials(
  request: Request,
  provider: ProviderId,
  model: string,
): ResolvedChatCredentials | null {
  const headerProvider = request.headers.get(HEADER_PROVIDER) as ProviderId | null;
  const userKey = request.headers.get(HEADER_KEY)?.trim();

  // Only trust the user key if it was sent for the provider we're calling.
  if (userKey && (!headerProvider || headerProvider === provider)) {
    return { provider, apiKey: userKey, model, fromServerEnv: false };
  }

  const envKey = envKeyFor(provider);
  if (envKey) {
    return { provider, apiKey: envKey, model, fromServerEnv: true };
  }

  return null;
}

/**
 * Resolve an OpenAI key for speech-to-text. Whisper transcription is
 * OpenAI-only, so STT needs an OpenAI key even when the user chats with
 * another provider.
 */
export function resolveOpenAIKeyForStt(request: Request): string | null {
  const dedicated = request.headers.get(HEADER_OPENAI_KEY)?.trim();
  if (dedicated) return dedicated;

  // If the user's chat provider is OpenAI, reuse that key.
  const provider = request.headers.get(HEADER_PROVIDER);
  const userKey = request.headers.get(HEADER_KEY)?.trim();
  if (provider === "openai" && userKey) return userKey;

  const envKey = import.meta.env.OPENAI_API_KEY;
  return envKey ?? null;
}
